
import os
import re

def find_hardcoded_strings(root_dir):
    # Regex for JSX Text: <Text>Something</Text>
    jsx_text_pattern = re.compile(r'>\s*([A-Z][^<{}]+)\s*<')
    # Regex for props: title="Something", placeholder="Something"
    props_pattern = re.compile(r'\b(title|placeholder|label|message)=["\']([A-Z][^"\'{}]+)["\']')
    
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.js') or file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read()
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            # Skip imports and comments
                            if line.strip().startswith('import') or line.strip().startswith('//'):
                                continue
                                
                            jsx_matches = jsx_text_pattern.findall(line)
                            for match in jsx_matches:
                                if len(match.strip()) > 2:
                                    print(f"{path}:{i+1} JSX Text: {match.strip()}")
                                    
                            props_matches = props_pattern.findall(line)
                            for key, val in props_matches:
                                if len(val.strip()) > 2:
                                    print(f"{path}:{i+1} Prop '{key}': {val.strip()}")
                    except:
                        pass

find_hardcoded_strings('src')
