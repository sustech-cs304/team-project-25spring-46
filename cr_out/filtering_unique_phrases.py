

text = input().lower().translate(str.maketrans('','',',.!'))
# print(text)
# print(len(text))
min_length = int(input())
max_length = int(input())

words = text.split()
word_lens = [len(x) for x in text.split()]
# print(words)
# print(word_lens)
word_offsets = [0]
for i in range(len(word_lens)):
    word_offsets.append(word_offsets[i] + word_lens[i] + 1)
# print(word_offsets)
phrases = set()
for i in range(len(word_lens)):
    length = word_lens[i]
    if length > max_length:
        continue
    if length >= min_length:
        phrases.add(text[word_offsets[i]:word_offsets[i+1]-1])
    for j in range(i+1, len(word_lens)):
        length += word_lens[j]
        if length > max_length:
            break
        if length >= min_length:
            phrases.add(text[word_offsets[i]:word_offsets[j+1]-1])

result = sorted(phrases)
print(', '.join(result))
