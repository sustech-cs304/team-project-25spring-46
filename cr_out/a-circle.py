r = float(input())
pi = 3.14159
print(f"The radius of the given circle is {r}.")
# print(f"Area: {round(pi * r * r, 2)}.")
# print(f"Circumference: {round(2 * pi * r, 2)}.")
# try another method to round the numbers
print(f"Area: {pi * r * r:.2f}.")
print(f"Circumference: {2 * pi * r:.2f}.")


r = float(input())
pi = 3.14159

area = pi * r ** 2
circumference = 2 * pi * r

print(f"The radius of the given circle is {r}.")
print(f"Area: {area:.2f}.")
print(f"Circumference: {circumference:.2f}.")

print("The radius of the given circle is {}.".format(r))
print("Area: {:.2f}.".format(area))
print("Circumference: {:.2f}.".format(circumference))