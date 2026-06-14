import re
import glob
import json

files = glob.glob('apps/app/src/**/*.tsx', recursive=True) + glob.glob('apps/app/src/**/*.ts', recursive=True)

import_regex = re.compile(r'import\s+type\s*\{\s*([^}]+)\}\s*from\s*["\']@tabler/icons-react["\']|import\s*\{\s*([^}]+)\}\s*from\s*["\']@tabler/icons-react["\']')

audit = {}

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            for match in import_regex.finditer(content):
                group = match.group(1) or match.group(2)
                if group:
                    # split by comma, strip whitespace
                    items = []
                    for item in group.split(','):
                        item = item.strip()
                        if not item:
                            continue
                        items.append(item)
                    if items:
                        audit[file_path] = items
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

print(json.dumps(audit, indent=2))
