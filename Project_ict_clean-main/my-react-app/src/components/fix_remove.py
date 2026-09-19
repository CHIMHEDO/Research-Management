p = r'D:\downloads\Research-Management\Project_ict_clean-main\my-react-app\src\components\ScholarImportModal.jsx'
c = open(p, 'r', encoding='utf-8').read()
lines = c.split('\n')

# Remove line 608 (index 607): ')}' — extra closing
# And remove line 612 (index 611): '}' — extra closing
print('Before fix:')
for i in range(604, 613):
    print(f'{i+1}: {lines[i]}')

# Remove the extra ')}' at index 607
lines.pop(607)
# Remove the extra '}' at index 611 (was 612, now 611 after first pop)
if lines[611].strip() == '}':
    lines.pop(611)

print('After fix:')
for i in range(604, 611):
    print(f'{i+1}: {lines[i]}')

c = '\n'.join(lines)
open(p, 'w', encoding='utf-8').write(c)
print('Done')
