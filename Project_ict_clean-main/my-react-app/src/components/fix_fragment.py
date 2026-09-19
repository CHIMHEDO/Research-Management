import sys
p = sys.argv[1]
c = open(p, 'r', encoding='utf-8').read()
lines = c.split('\n')

# Replace {scopusTab !== 'scopus' && ( with fragment wrapper
old_line = lines[372]
if '{scopusTab' in old_line and '&& (' in old_line:
    lines[372] = old_line.replace('&& (', '&& (<>')
    print('Changed line 373:', lines[372].strip())

# Find ))} near end and replace with </>)}
for i in range(500, len(lines)):
    if '))}' in lines[i]:
        lines[i] = lines[i].replace('))}', '</>)}')
        print('Changed line', i+1, ':', lines[i].strip())
        break

open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print('Done')
