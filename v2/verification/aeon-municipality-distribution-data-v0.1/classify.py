"""Classify only from the workbook's current names and recorded evidence."""
import re
import unicodedata
from urllib.parse import urlsplit


def normalized(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value or "")).casefold()


class Brands:
    def __init__(self, rules, overrides):
        self.rules = rules
        self.overrides = overrides
        self.pending = rules["pending"]
        self.groups = {}
        for group, brands in rules["groups"].items():
            for brand in brands:
                if brand in self.groups:
                    raise ValueError(f"Duplicate brand group membership: {brand}")
                self.groups[brand] = group
        self.prefixes = sorted(
            ((normalized(token), brand) for brand, tokens in rules["name_prefixes"].items()
             for token in tokens),
            key=lambda item: (-len(item[0]), item),
        )
        self.patterns = [(re.compile(pattern), brand)
                         for brand, pattern in rules["name_patterns"].items()]

    def signal(self, value):
        name = normalized(value)
        for pattern, brand in self.patterns:
            if pattern.search(name):
                return brand
        # These refer to retail facilities and can occur in store names for other brands.
        if name.startswith(("イオンタウン", "イオンモール")):
            return None
        return next((brand for token, brand in self.prefixes if name.startswith(token)), None)

    def classify(self, store, master, legacy):
        source = store["有効屋号"]
        names = {field: self.signal(row.get(field)) for field, row in (
            ("現行公式名", master), ("公式店舗名", store), ("表示用店舗名", store))}
        signal = next((brand for brand in names.values() if brand), None)
        unique = set(names.values()) - {None}
        workbook_reason = master.get("屋号の根拠・由来") or "根拠欄なし"
        source_url = store["公式店舗URL"] or ""
        alias = self.rules["aliases"].get(source, source)
        allowed_groups = self.rules["compound_groups"].get(source)
        if not allowed_groups and alias in self.groups:
            allowed_groups = [self.groups[alias]]
        override = self.overrides.get(store["全国統合ID"])
        if override:
            if (source or "") != override["expected_original_brand"] or store["表示用店舗名"] != override["expected_name"]:
                raise ValueError(f"Stale brand override: {store['全国統合ID']}")
            result = (override["brand"], "B04", override["status"], override["reason"])
            source_url = override["evidence_url"] or source_url
        elif unique == {"カスミ"} and source is None and legacy == "カスミ" and self.kasumi_evidence(store):
            result = ("カスミ", "B06", "candidate", "公式個店由来の表示名にカスミ。Excel有効屋号の空欄を保持")
        elif len(unique) > 1:
            result = (self.pending, "B05", "pending", "現行公式名・公式店舗名・表示用店舗名の屋号候補が競合")
        elif (signal and source == "イオンフードスタイル"
              and urlsplit(source_url).hostname == "aeonfoodstyle.com"
              and (self.groups[signal] == "マックスバリュ系"
                   or signal in {"ピーコックストア", "グルメシティ"})):
            result = (signal, "B07", "candidate", "公式店舗ページ由来の採録名に別屋号。台帳の分類と差異あり")
        elif signal and allowed_groups and self.groups[signal] in allowed_groups:
            rule = "B03" if source in self.rules["aliases"] else "B01"
            status = "retained" if source == signal else "candidate"
            result = (signal, rule, status, "台帳の名称欄に明示された屋号を採用")
        elif signal:
            result = (self.pending, "B05", "pending", "名称の屋号候補と台帳の分類が一致しない")
        elif source == "フードマーケット カスミ" and self.kasumi_evidence(store):
            result = ("カスミ", "B03", "candidate", "有効屋号にフードマーケット カスミ。公式個店の名称は立地を示す")
        elif source == "カスミ系列" and self.kasumi_evidence(store):
            result = (self.pending, "B05", "pending", "公式個店の採録名に業態名の明記がなく、カスミ系列内の個別屋号が未同定")
        elif alias in self.groups:
            status = "retained" if source == alias else "candidate"
            result = (alias, "B02" if source == alias else "B03", status, "台帳の有効屋号を使用。名称の屋号省略を許容")
        else:
            result = (self.pending, "B05", "pending", "有効屋号または個別屋号を確認できる名称がない")
        brand, rule, status, reason = result
        return {
            "brand": brand, "brand_group": self.groups[brand], "brand_status": status,
            "brand_rule_id": rule, "brand_basis": reason, "brand_evidence_url": source_url,
            "master_brand_basis": workbook_reason, "name_brand_signals": names,
        }

    @staticmethod
    def kasumi_evidence(store):
        url = urlsplit(store["公式店舗URL"] or "")
        return (store["実運営法人"] == "株式会社カスミ"
                and url.hostname == "www.kasumi.co.jp" and url.path.startswith("/tenpotop/"))
