const ID = /UC-[A-Z]+-\d{3}/g;

export function parseUseCases(markdown) {
  const cases = new Map();
  for (const match of markdown.matchAll(/^\|\s*(UC-[A-Z]+-\d{3})\s*\|.*\|\s*(planned|implemented)\s*\|\s*$/gm)) {
    cases.set(match[1], match[2]);
  }
  return cases;
}

export function checkIds(docs, tests) {
  const cases = new Map();
  const errors = [];
  for (const doc of docs) {
    for (const [id, status] of parseUseCases(doc)) {
      if (cases.has(id)) errors.push(`${id} is defined more than once`);
      cases.set(id, status);
    }
  }
  const referenced = new Set(tests.flatMap((test) => test.match(ID) ?? []));
  for (const id of referenced) {
    if (!cases.has(id)) errors.push(`${id} is used in a test but is not in the architecture docs`);
  }
  for (const [id, status] of cases) {
    if (status === 'implemented' && !referenced.has(id)) errors.push(`${id} is implemented but no test references it`);
  }
  return errors;
}
