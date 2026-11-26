import sqlite3, pathlib
db=sqlite3.connect(":memory:")
for p in sorted((pathlib.Path(__file__).parent/"migrations").glob("*.sql")): db.executescript(p.read_text())
db.executemany("INSERT INTO accounts(id) VALUES(?)",[("a",),("b",)])
db.executemany("INSERT INTO expressions VALUES(?,?,?,?)", [("a",str(i),"en",'{"q":"test","answer":"test"}') for i in range(10000)]+[("b","0","fr",'{}')])
assert db.execute("SELECT count(*) FROM changes WHERE account_id=?",("a",)).fetchone()[0]==10000
stmt="INSERT INTO review_events VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,event_id) DO NOTHING"
for _ in range(2): db.execute(stmt,("a","event","0","correct","2026-11-26","session"))
assert db.execute("SELECT count(*) FROM review_events").fetchone()[0]==1
assert db.execute("SELECT count(*) FROM changes WHERE entity='event'").fetchone()[0]==1
try:
 db.execute(stmt,("b","bad","1","correct","2026-11-26","session"))
except sqlite3.IntegrityError: pass
else: raise AssertionError("cross-account foreign key")
db.commit()
try:
 with db:
  db.execute("INSERT INTO migration_state(account_id,archive_id) VALUES('a','test')")
  db.execute("INSERT INTO migration_receipts VALUES('a',0,NULL)")
except sqlite3.IntegrityError: pass
else: raise AssertionError("guard")
assert db.execute("SELECT count(*) FROM migration_state").fetchone()[0]==0
print("SQLite schema, 10000 rows, duplicate events, account isolation, rollback: PASS")
