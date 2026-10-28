"""Run dotted regression filenames as scripts; unittest discovery ignores them."""
from pathlib import Path
import subprocess
import sys
root = Path(__file__).resolve().parents[2]
files = sorted(root.joinpath('tests').glob('*.test.py'))
assert files, 'no Python regression scripts found'
for path in files:
    print(f'Running {path.name}', flush=True)
    subprocess.run([sys.executable, str(path)], cwd=root, check=True)
