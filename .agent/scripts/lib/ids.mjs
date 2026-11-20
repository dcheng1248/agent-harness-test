const ID = /UC-[A-Z]+-\d{3}/g;

export function parseUseCases(markdown) {
  const cases = new Map();
  for (const match of markdown.matchAll(/^\|\s*(UC-[A-Z]+-\d{3})\s*\|.*\|\s*(planned|implemented)\s*\|\s*$/gm)) {
    cases.set(match[1], match[2]);
  }
  return cases;
}

/**
 * useCaseDocs: the USE_CASES.md files, which define every ID.
 * structuralDocs: the architecture files, which must not hold use case tables.
 */
export function checkIds(useCaseDocs, tests, structuralDocs = []) {
  const cases = new Map();
  const errors = [];
  for (const doc of useCaseDocs) {
    for (const [id, status] of parseUseCases(doc)) {
      if (cases.has(id)) errors.push(`${id} is defined more than once`);
      cases.set(id, status);
    }
  }
  for (const doc of structuralDocs) {
    for (const id of parseUseCases(doc).keys()) {
      errors.push(`${id} is listed in an architecture file. Use cases belong in the module's USE_CASES.md`);
    }
  }
  const referenced = new Set(tests.flatMap((test) => test.match(ID) ?? []));
  for (const id of referenced) {
    if (!cases.has(id)) errors.push(`${id} is used in a test but is not in any USE_CASES.md`);
  }
  for (const [id, status] of cases) {
    if (status === 'implemented' && !referenced.has(id)) errors.push(`${id} is implemented but no test references it`);
  }
  return errors;
}
