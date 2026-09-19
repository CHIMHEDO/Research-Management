p = r'D:\downloads\Research-Management\Project_ict_clean-main\my-react-app\src\components\ScholarImportModal.jsx'
c = open(p, 'r', encoding='utf-8').read()
lines = c.split('\n')

# Line 605 (index 604): change </div>} : null to } : null
old = lines[604]
lines[604] = old.replace('</div>} : null', '} : null')
print('Line 605 old:', old.strip())
print('Line 605 new:', lines[604].strip())

c = '\n'.join(lines)
open(p, 'w', encoding='utf-8').write(c)
print('Done')
