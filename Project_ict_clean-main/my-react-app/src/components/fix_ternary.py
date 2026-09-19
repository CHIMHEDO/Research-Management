p = r'D:\downloads\Research-Management\Project_ict_clean-main\my-react-app\src\components\ScholarImportModal.jsx'
c = open(p, 'r', encoding='utf-8').read()
lines = c.split('\n')

# Line 373: change {scopusTab !== 'scopus' && (<div> to {scopusTab !== 'scopus' ? <div>
old = lines[372]
lines[372] = old.replace("&& (<div>", "? <div>")
print('Line 373 old:', old.strip())
print('Line 373 new:', lines[372].strip())

# Line 605 (index 604): change </div>)} to </div>} : null
old2 = lines[604]
lines[604] = old2.replace('</div>)}', '</div>} : null')
print('Line 605 old:', old2.strip())
print('Line 605 new:', lines[604].strip())

c = '\n'.join(lines)
open(p, 'w', encoding='utf-8').write(c)
print('Done')
