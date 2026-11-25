"use strict";
// Consistency checks for the agent harness: AGENTS.md rule IDs, decision records,
// lessons learned and the unit test list. No application runtime code is loaded.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const agents = read("AGENTS.md");
const RULE = /^- \[([A-Z]+-\d{2})\]/gm;
const ruleIds = [...agents.matchAll(RULE)].map(m => m[1]);
const decisionsDir = "docs/decisions";
const adrFiles = fs.readdirSync(path.join(root, decisionsDir)).filter(f => /^\d{4}-[a-z0-9-]+\.md$/.test(f)).sort();

function localLinks(markdown) {
  return [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1])
    .filter(href => !/^(https?:|mailto:|#)/.test(href)).map(href => href.split("#")[0]).filter(Boolean);
}

test("AGENTS.md rule IDs are well formed, unique and numbered per group", () => {
  assert.ok(ruleIds.length >= 30, "expected the rule list to be parsed");
  const seen = new Set();
  for (const id of ruleIds) { assert.ok(!seen.has(id), "duplicate rule ID " + id); seen.add(id); }
  let section = null;
  for (const line of agents.split("\n")) {
    const heading = line.match(/^## ([A-Z]+) —/);
    if (heading) { section = heading[1]; continue; }
    if (/^## /.test(line)) { section = null; continue; }
    const rule = line.match(/^- \[([A-Z]+)-\d{2}\]/);
    if (rule) assert.equal(rule[1], section, line.slice(0, 40) + " is not under '## " + rule[1] + " —'");
  }
});

test("rule IDs cited in AGENTS.md, decisions, lessons and PR template exist", () => {
  const known = new Set(ruleIds);
  const files = ["AGENTS.md", "docs/LESSONS_LEARNED.md", ".github/pull_request_template.md",
    ...adrFiles.map(f => decisionsDir + "/" + f), decisionsDir + "/README.md"];
  for (const file of files) {
    for (const m of read(file).matchAll(/\[([A-Z]+-\d{2})\](?!\])/g)) {
      if (/^(NHÓM|LL|ADR)/.test(m[1])) continue;
      assert.ok(known.has(m[1]), file + " cites unknown rule " + m[1]);
    }
  }
});

test("local links in harness documents resolve", () => {
  const files = ["AGENTS.md", "docs/LESSONS_LEARNED.md", ...adrFiles.map(f => decisionsDir + "/" + f), decisionsDir + "/README.md"];
  for (const file of files) {
    for (const href of localLinks(read(file))) {
      const target = path.resolve(root, path.dirname(file), href);
      assert.ok(fs.existsSync(target), file + " links to missing " + href);
    }
  }
});

test("every decision record is indexed and has the required sections", () => {
  assert.ok(adrFiles.length >= 1);
  const index = read(decisionsDir + "/README.md");
  for (const f of adrFiles) {
    assert.ok(index.includes("](" + f + ")"), f + " missing from docs/decisions/README.md");
    const body = read(decisionsDir + "/" + f);
    const num = f.slice(0, 4);
    assert.match(body, new RegExp("^# ADR-" + num + " — ", "m"), f + " title must start with ADR-" + num);
    assert.match(body, /\*\*Trạng thái:\*\*/, f + " needs a status");
    assert.match(body, /\*\*Ngày:\*\*/, f + " needs a date");
  }
  const nums = adrFiles.map(f => f.slice(0, 4));
  assert.equal(new Set(nums).size, nums.length, "duplicate ADR number");
});

test("lessons learned entries are unique and complete", () => {
  const text = read("docs/LESSONS_LEARNED.md").replace(/^```[\s\S]*?^```/gm, "");
  const parts = text.split(/^## (?=LL-)/m).slice(1);
  assert.ok(parts.length >= 1, "expected at least one LL entry");
  const ids = new Set();
  for (const part of parts) {
    const id = part.match(/^LL-(\d{3}):/);
    assert.ok(id, "entry heading must be 'LL-NNN: title'");
    assert.ok(!ids.has(id[1]), "duplicate LL-" + id[1]); ids.add(id[1]);
    for (const field of ["Triệu chứng", "Nguyên nhân gốc", "Phòng ngừa", "Kiểm chứng", "Nguồn", "Trạng thái"])
      assert.ok(part.includes("**" + field), "LL-" + id[1] + " missing field " + field);
    assert.match(part, /\*\*Trạng thái:\*\* (active|retired)\b/, "LL-" + id[1] + " status must be active or retired");
    for (const m of part.matchAll(/`(tests\/[\w.\/-]+\.(?:js|cjs))`/g))
      assert.ok(fs.existsSync(path.join(root, m[1])), "LL-" + id[1] + " cites missing " + m[1]);
  }
});

test("every tests/*.test.js file is part of npm run test:unit", () => {
  const script = JSON.parse(read("package.json")).scripts["test:unit"];
  const listed = new Set(script.match(/tests\/[\w.-]+\.test\.js/g));
  const onDisk = fs.readdirSync(path.join(root, "tests")).filter(f => f.endsWith(".test.js")).map(f => "tests/" + f);
  const missing = onDisk.filter(f => !listed.has(f));
  assert.deepEqual(missing, [], "unit tests not run by npm run test:unit");
  for (const f of listed) assert.ok(fs.existsSync(path.join(root, f)), "test:unit lists missing " + f);
});
