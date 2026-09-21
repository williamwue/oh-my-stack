# Writing cleanup fixture

Use only the Oh My Stack Skills generated inside this repository. Do not
search for or read installed Skills, plugin caches, or source-host versions
elsewhere on the machine. Explicitly load `technical-writing`, then load and
apply its required `unslop` Skill.

Rewrite `project/docs/run-locally.md` as one concise how-to. Preserve every
technical fact: Node.js is a prerequisite; the two commands use port `4100`;
the test count is four passing and zero failing; the server and health check
have exact expected outputs; the health URL stays unchanged; and `Ctrl+C`
stops the process. Keep the facts in their existing operational order. Do not
add background, reference material, unsupported requirements, or invented
facts.

Run `node --test test/docs.test.mjs` from `project/` before editing and capture
the intended failure. Edit only `project/docs/run-locally.md`. Do not delegate
or modify the test to make it pass. Inspect the complete diff, then rerun the
same command as root and require one passing test. Confirm that no other path
changed.

Do not commit, push, publish, or open a pull request. Report the selected
Diátaxis mode, the before and after outcomes, the changed path, the preserved
facts, the main writing rules applied, and any limitation.
