# result = 0.0
try:
    a = float(input())
    b = float(input())
    c = input()
    if c == "+":
        result = a+b
    elif c == "-":
        result = a-b
    elif c == "*":
        result = a*b
    elif c == "/":
        if b == 0:
            raise ValueError("Division by zero is not allowed. Please enter a non-zero divisor.")
        else:
            result = a/b
    elif c == "^":
        if not b.is_integer():
            # print("nb")
            raise ValueError("The exponent must be an integer. Please enter an integer exponent.")
        else:
            result = a**b
except ValueError as e:
    print(e)
    if c == "/":
        b = float(input())
        result = a/b
    elif c == "^":
        b = int(input())
        result = a**b
finally:
    print("{:.2f}".format(result))