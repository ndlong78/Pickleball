"use strict";
// Gate guard: detects pull requests that weaken the evaluation gates (AGENTS.md [CI-03]).
// Pure logic, no I/O. Input mirrors the GitHub "list pull request files" API:
// [{ filename, status: added|modified|removed|renamed|copied|changed, patch?, previous_filename? }]

const OVERRIDE_LABEL = "gates-change";

const TEST_FILE = /^(tests\/.+\.(?:js|cjs|mjs)|scripts\/test_[\w-]+\.(?:py|cjs|js)|supabase\/tests\/.+\.sql)$/;
const ASSERTION = {
  js: /\b(?:expect|assert)(?:\.[A-Za-z]+)*\s*\(|\bt\.assert\b/g,
  py: /\bself\.assert[A-Za-z]*\s*\(|^\s*assert\s/g,
  sql: /\b(?:ok|is|isnt|is_empty|isnt_empty|throws_ok|throws_like|lives_ok|results_eq|set_eq|bag_eq|row_eq|has_table|has_column|has_function|policies_are|col_is_pk|fk_ok)\s*\(/gi
};
const SKIP = /\b(?:test|it|describe)(?:\.describe)?\.(?:skip|only|fixme|todo)\s*\(|\btest\.slow\s*\(|\{\s*(?:skip|todo|only)\s*:\s*(?![\s]|false\b)|\bpytest\.mark\.skip|\bunittest\.skip|\bself\.skipTest\s*\(|\bSKIP\s*\(|\bskip\s*\(\s*['"]/;
const RETRY = /\bretries\s*[:=]|\.retry\s*\(|\bfailOnFlakyTests\b|\brepeatEach\b/;
const TIMEOUT_VALUE = /\b(?:timeout|setTimeout|actionTimeout|navigationTimeout)\s*[:(=]\s*([0-9][0-9_]*)/g;

// Any change to these files changes the verifier itself.
const GATE_CONFIG = [
  { re: /^\.github\/CODEOWNERS$/, why: "CODEOWNERS" },
  { re: /^\.github\/workflows\/gate-guard\.yml$/, why: "workflow gate-guard" },
  { re: /^scripts\/gate-guard(?:-core)?\.cjs$/, why: "chính bộ gate-guard" },
  { re: /^tests\/gate-guard\.test\.js$/, why: "test của gate-guard" }
];
const WORKFLOW = /^\.github\/workflows\/.+\.ya?ml$/;
const PLAYWRIGHT_CONFIG = /^playwright\.config\.(?:c?js|mjs|ts)$/;

function kindOf(filename) {
  if (filename.endsWith(".sql")) return "sql";
  if (filename.endsWith(".py")) return "py";
  return "js";
}

function patchLines(patch) {
  const added = [], removed = [];
  if (typeof patch !== "string") return { added, removed };
  for (const line of patch.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
    if (line.startsWith("+")) added.push(line.slice(1));
    else if (line.startsWith("-")) removed.push(line.slice(1));
  }
  return { added, removed };
}

function countMatches(lines, re) {
  let n = 0;
  for (const line of lines) { re.lastIndex = 0; n += (line.match(re) || []).length; }
  return n;
}

function timeoutValues(lines) {
  const values = [];
  for (const line of lines) {
    TIMEOUT_VALUE.lastIndex = 0;
    let m;
    while ((m = TIMEOUT_VALUE.exec(line))) values.push(Number(m[1].replace(/_/g, "")));
  }
  return values;
}

function testPathsIn(lines) {
  const paths = new Set();
  for (const line of lines) for (const m of line.matchAll(/tests\/[\w./-]+\.(?:js|cjs|mjs)/g)) paths.add(m[0]);
  return paths;
}

function analyzeTestFile(file, findings) {
  const name = file.filename;
  if (file.status === "removed") { findings.push({ file: name, rule: "test-removed", detail: "xóa file test" }); return; }
  if (file.status === "added" || file.status === "copied") {
    const { added } = patchLines(file.patch);
    const skips = added.filter(l => SKIP.test(l));
    if (skips.length) findings.push({ file: name, rule: "skip-added", detail: "thêm skip/only/fixme: " + skips[0].trim().slice(0, 100) });
    return;
  }
  if (typeof file.patch !== "string") {
    findings.push({ file: name, rule: "patch-unavailable", detail: "GitHub không trả diff (file quá lớn); cần owner xem tay" });
    return;
  }
  const { added, removed } = patchLines(file.patch);
  const re = ASSERTION[kindOf(name)];
  const lost = countMatches(removed, re) - countMatches(added, re);
  if (lost > 0) findings.push({ file: name, rule: "assertions-removed", detail: "giảm " + lost + " assertion" });
  const skips = added.filter(l => SKIP.test(l));
  if (skips.length) findings.push({ file: name, rule: "skip-added", detail: "thêm skip/only/fixme: " + skips[0].trim().slice(0, 100) });
  const retries = added.filter(l => RETRY.test(l));
  if (retries.length) findings.push({ file: name, rule: "retry-changed", detail: "thêm/đổi retry: " + retries[0].trim().slice(0, 100) });
  const before = timeoutValues(removed), after = timeoutValues(added);
  if (before.length && after.length && Math.max(...after) > Math.max(...before))
    findings.push({ file: name, rule: "timeout-raised", detail: "tăng timeout " + Math.max(...before) + " → " + Math.max(...after) });
}

function analyzeMigration(file, findings) {
  if (file.status !== "added") findings.push({ file: file.filename, rule: "migration-changed", detail: "sửa/xóa migration đã có (" + file.status + ")" });
}

function analyzePackageJson(file, findings) {
  const { added, removed } = patchLines(file.patch);
  const scriptLine = l => /"test:[\w:-]+"\s*:/.test(l);
  const before = testPathsIn(removed.filter(scriptLine)), after = testPathsIn(added.filter(scriptLine));
  const dropped = [...before].filter(p => !after.has(p));
  if (dropped.length) findings.push({ file: file.filename, rule: "test-script-shrunk", detail: "bỏ khỏi script test: " + dropped.slice(0, 5).join(", ") });
}

function specNames(lines) {
  const names = new Set();
  for (const line of lines) for (const m of line.matchAll(/["'`]([\w./*-]+\.spec\.[cm]?js)["'`]/g)) names.add(m[1]);
  return names;
}

// Additions (new specs in testMatch, new projects) are fine; dropping specs or touching
// retry/timeout/flaky settings is not.
function analyzePlaywrightConfig(file, findings) {
  if (file.status === "removed") { findings.push({ file: file.filename, rule: "gate-config", detail: "xóa cấu hình Playwright" }); return; }
  const { added, removed } = patchLines(file.patch);
  const dropped = [...specNames(removed)].filter(n => !specNames(added).has(n));
  if (dropped.length) findings.push({ file: file.filename, rule: "spec-dropped", detail: "bỏ khỏi testMatch: " + dropped.slice(0, 5).join(", ") });
  const retry = added.filter(l => RETRY.test(l));
  if (retry.length) findings.push({ file: file.filename, rule: "retry-changed", detail: "đổi retry/flaky: " + retry[0].trim().slice(0, 100) });
  const before = timeoutValues(removed), after = timeoutValues(added);
  if (before.length && after.length && Math.max(...after) > Math.max(...before))
    findings.push({ file: file.filename, rule: "timeout-raised", detail: "tăng timeout " + Math.max(...before) + " → " + Math.max(...after) });
}

// New workflows and new steps are fine; removing or rewriting existing workflow lines is not.
function analyzeWorkflow(file, findings) {
  if (file.status === "added" || file.status === "copied") return;
  if (file.status === "removed") { findings.push({ file: file.filename, rule: "workflow-changed", detail: "xóa workflow" }); return; }
  const { removed } = patchLines(file.patch);
  const changed = removed.filter(l => l.trim() && !l.trim().startsWith("#"));
  if (changed.length) findings.push({ file: file.filename, rule: "workflow-changed", detail: "xóa/sửa " + changed.length + " dòng workflow, ví dụ: " + changed[0].trim().slice(0, 80) });
}

function analyze(files) {
  const findings = [];
  for (const file of files || []) {
    const name = file.filename;
    const gate = GATE_CONFIG.find(g => g.re.test(name) || (file.previous_filename && g.re.test(file.previous_filename)));
    if (gate) { findings.push({ file: name, rule: "gate-config", detail: "thay đổi " + gate.why + " (" + file.status + ")" }); continue; }
    if (file.status === "renamed" && file.previous_filename && TEST_FILE.test(file.previous_filename) && !TEST_FILE.test(name)) {
      findings.push({ file: file.previous_filename, rule: "test-removed", detail: "đổi tên file test ra ngoài thư mục test → " + name });
      continue;
    }
    if (WORKFLOW.test(name)) { analyzeWorkflow(file, findings); continue; }
    if (PLAYWRIGHT_CONFIG.test(name)) { analyzePlaywrightConfig(file, findings); continue; }
    if (/^supabase\/migrations\//.test(name)) { analyzeMigration(file, findings); continue; }
    if (name === "package.json") { analyzePackageJson(file, findings); continue; }
    if (TEST_FILE.test(name)) analyzeTestFile(file, findings);
  }
  return findings;
}

function decide(findings, labels) {
  const overridden = (labels || []).includes(OVERRIDE_LABEL);
  return { pass: findings.length === 0 || overridden, overridden: overridden && findings.length > 0 };
}

function report(findings, decision) {
  const lines = ["## Gate guard"];
  if (!findings.length) { lines.push("Không phát hiện thay đổi làm yếu cổng kiểm thử."); return lines.join("\n"); }
  lines.push(decision.overridden
    ? "Có thay đổi cổng kiểm thử, **đã có label `" + OVERRIDE_LABEL + "`**: owner phải tự review và merge (AGENTS.md [MERGE-02])."
    : "Phát hiện thay đổi làm yếu cổng kiểm thử. Owner review rồi gắn label `" + OVERRIDE_LABEL + "` nếu đồng ý. Agent không được tự gắn label này (AGENTS.md [MERGE-02]).");
  lines.push("", "| File | Quy tắc | Chi tiết |", "|---|---|---|");
  for (const f of findings) lines.push("| `" + f.file + "` | " + f.rule + " | " + String(f.detail).replace(/\|/g, "\\|") + " |");
  return lines.join("\n");
}

module.exports = { OVERRIDE_LABEL, analyze, decide, report, patchLines };
