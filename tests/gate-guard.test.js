"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { analyze, decide, report, patchLines, OVERRIDE_LABEL } = require("../scripts/gate-guard-core.cjs");

const patch = (removed, added) => "@@ -1,3 +1,3 @@\n" + removed.map(l => "-" + l).join("\n") + (removed.length && added.length ? "\n" : "") + added.map(l => "+" + l).join("\n");
const mod = (filename, removed, added) => ({ filename, status: "modified", patch: patch(removed, added) });
const rules = files => analyze(files).map(f => f.rule);

test("patch parser ignores headers and context", () => {
  const p = patchLines("--- a/x\n+++ b/x\n@@ -1 +1 @@\n keep\n-old\n+new");
  assert.deepEqual(p, { added: ["new"], removed: ["old"] });
  assert.deepEqual(patchLines(undefined), { added: [], removed: [] });
});

test("adding tests, assertions and specs is not flagged", () => {
  assert.deepEqual(rules([
    { filename: "tests/new.test.js", status: "added", patch: patch([], ["assert.equal(1,1)"]) },
    mod("tests/old.spec.cjs", ["await expect(a).toBe(1)"], ["await expect(a).toBe(1)", "await expect(b).toBe(2)"]),
    mod("playwright.config.cjs", ['testMatch:["a.spec.cjs"],'], ['testMatch:["a.spec.cjs","b.spec.cjs"],']),
    mod("package.json", ['"test:unit": "node --test tests/a.test.js"'], ['"test:unit": "node --test tests/a.test.js tests/b.test.js"']),
    { filename: ".github/workflows/new.yml", status: "added", patch: patch([], ["on: push"]) },
    mod(".github/workflows/responsive.yml", [], ["      - run: npm run extra"]),
    { filename: "supabase/migrations/20261201000100_x.sql", status: "added", patch: patch([], ["create table t();"]) },
    mod("modules/app-core.js", ["assert(x)"], [])
  ]), []);
});

test("net loss of assertions is flagged for JS, Python and pgTAP", () => {
  assert.deepEqual(rules([mod("tests/a.spec.cjs", ["await expect(x).toBe(1)", "assert.equal(y,2)"], ["await expect(x).toBe(1)"])]), ["assertions-removed"]);
  assert.deepEqual(rules([mod("scripts/test_sync.py", ["        self.assertEqual(a, b)"], [])]), ["assertions-removed"]);
  assert.deepEqual(rules([mod("supabase/tests/001_security_and_sync.test.sql", ["select ok(true, 'x');", "select is(1, 1, 'y');"], ["select ok(true, 'x');"])]), ["assertions-removed"]);
  assert.deepEqual(rules([mod("tests/a.test.js", ["assert.equal(a,1)"], ["assert.equal(a, 1)"])]), [], "reformatting keeps the count");
});

test("skip/only/fixme, retries and raised timeouts are flagged", () => {
  for (const line of ["test.skip('x', async () => {})", "test.only('x', () => {})", "describe.skip('x', () => {})",
    "test('x', { skip: true }, () => {})", "test.fixme('x')", "test('x', { todo: 'later' }, () => {})"])
    assert.deepEqual(rules([mod("tests/a.spec.cjs", [], [line])]), ["skip-added"], line);
  assert.deepEqual(rules([mod("tests/a.test.js", [], ["test('x', { skip: false }, () => {})"])]), []);
  assert.deepEqual(rules([mod("tests/a.spec.cjs", [], ["test.describe.configure({ retries: 2 })"])]), ["retry-changed"]);
  assert.deepEqual(rules([mod("tests/a.spec.cjs", ["await expect(x).toBeVisible({timeout:5000})"], ["await expect(x).toBeVisible({timeout:15000})"])]), ["timeout-raised"]);
  assert.deepEqual(rules([mod("tests/a.spec.cjs", ["await expect(x).toBeVisible({timeout:15000})"], ["await expect(x).toBeVisible({timeout:5000})"])]), []);
  assert.deepEqual(rules([{ filename: "tests/a.spec.cjs", status: "added", patch: patch([], ["test.only('x')"]) }]), ["skip-added"]);
});

test("removed tests, dropped specs and shrunk test scripts are flagged", () => {
  assert.deepEqual(rules([{ filename: "tests/a.spec.cjs", status: "removed" }]), ["test-removed"]);
  assert.deepEqual(rules([{ filename: "old/a.spec.cjs", previous_filename: "tests/a.spec.cjs", status: "renamed", patch: "" }]), ["test-removed"]);
  assert.deepEqual(rules([mod("playwright.config.cjs", ['testMatch:["a.spec.cjs","b.spec.cjs"],'], ['testMatch:["a.spec.cjs"],'])]), ["spec-dropped"]);
  assert.deepEqual(rules([mod("playwright.config.cjs", ["retries:process.env.CI?1:0,"], ["retries:process.env.CI?3:0,"])]), ["retry-changed"]);
  assert.deepEqual(rules([mod("package.json", ['"test:unit": "node --test tests/a.test.js tests/b.test.js"'], ['"test:unit": "node --test tests/a.test.js"'])]), ["test-script-shrunk"]);
  assert.deepEqual(rules([{ filename: "tests/huge.spec.cjs", status: "modified" }]), ["patch-unavailable"]);
});

test("workflow edits, migration edits and changes to the guard itself are flagged", () => {
  assert.deepEqual(rules([mod(".github/workflows/responsive.yml", ["      - run: npm run test:unit"], ["      - run: echo skip"])]), ["workflow-changed"]);
  assert.deepEqual(rules([{ filename: ".github/workflows/backend-checks.yml", status: "removed" }]), ["workflow-changed"]);
  assert.deepEqual(rules([mod(".github/workflows/responsive.yml", ["  # old comment"], ["  # new comment"])]), []);
  assert.deepEqual(rules([mod("supabase/migrations/20261111000100_x.sql", ["a"], ["b"])]), ["migration-changed"]);
  for (const f of [".github/workflows/gate-guard.yml", "scripts/gate-guard.cjs", "scripts/gate-guard-core.cjs", "tests/gate-guard.test.js", ".github/CODEOWNERS"])
    assert.deepEqual(rules([{ filename: f, status: "added", patch: "" }]), ["gate-config"], f);
});

test("decision: findings fail unless the owner label is present", () => {
  const findings = analyze([{ filename: "tests/a.spec.cjs", status: "removed" }]);
  assert.deepEqual(decide([], []), { pass: true, overridden: false });
  assert.deepEqual(decide(findings, ["documentation"]), { pass: false, overridden: false });
  assert.deepEqual(decide(findings, [OVERRIDE_LABEL]), { pass: true, overridden: true });
  assert.match(report(findings, decide(findings, [])), /gates-change/);
  assert.match(report([], decide([], [])), /Không phát hiện/);
  assert.match(report([{ file: "a", rule: "r", detail: "x|y" }], { pass: false, overridden: false }), /x\\\|y/);
});
