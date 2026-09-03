export async function first(db, sql, ...params) {
  return db.prepare(sql).bind(...params).first();
}

export async function all(db, sql, ...params) {
  const result = await db.prepare(sql).bind(...params).all();
  return result.results || [];
}

export async function run(db, sql, ...params) {
  return db.prepare(sql).bind(...params).run();
}
