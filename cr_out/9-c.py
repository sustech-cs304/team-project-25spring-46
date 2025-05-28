import csv

file_name = input()

with open(file_name, 'r') as input_files:
    input_files = input_files.readlines()
    input_files = [f.rstrip() for f in input_files]
    # print(input_files)
    for file in input_files:
        if file.endswith('csv'):
            with open(file) as csvfile:
                csv_reader = csv.reader(csvfile)
                x, y = -1, 0
                for row in csv_reader:
                    y = len(row)
                    x += 1
                print(x, y)
        if file.endswith('txt'):
            with open(file, 'r') as txtfile:
                lines = txtfile.readlines()
                cnt = 0
                for line in lines:
                    for letter in line:
                        if letter >= 'a' and letter <= 'z':
                            cnt += 1
                print(cnt)
                