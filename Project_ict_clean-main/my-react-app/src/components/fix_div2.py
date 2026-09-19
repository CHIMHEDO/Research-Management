p = r'D:\downloads\Research-Management\Project_ict_clean-main\my-react-app\src\components\ScholarImportModal.jsx'
c = open(p, 'r', encoding='utf-8').read()
lines = c.split('\n')

# Line 605 (index 604): change } : null to </div>\n  </div>\n} : null
old = lines[604]
print('Line 605 old:', old.strip())
# Replace } : null with the closing divs
indent = '        '  # 8 spaces
lines[604] = indent + '</div>'
# Insert new line after 604
lines.insert(605, indent + '</div>} : null')
c = '\n'.join(lines)
open(p, 'w', encoding='utf-8').write(c)
print('Line 605 new:', lines[604].strip())
print('Line 606 new:', lines[605].strip())
print('Done')
