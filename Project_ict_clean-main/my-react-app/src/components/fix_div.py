p = r'D:\downloads\Research-Management\Project_ict_clean-main\my-react-app\src\components\ScholarImportModal.jsx'
c = open(p, 'r', encoding='utf-8').read()
c = c.replace("{scopusTab !== 'scopus' && (<>", "{scopusTab !== 'scopus' && (<div>")
lines = c.split('\n')
for i in range(len(lines)):
    if '</>)}' in lines[i] and i > 500:
        lines[i] = lines[i].replace('</>)}', '</div>)}')
        print('Fixed line', i+1, ':', lines[i].strip())
        break
c = '\n'.join(lines)
open(p, 'w', encoding='utf-8').write(c)
print('Done')
