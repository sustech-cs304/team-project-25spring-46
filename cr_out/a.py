import numpy as np
from typing import List

def ep(np_array: np.array, dim=1):
    """
    Expand the numpy array, inorder to print neatly.

    For dim=1, return a string to print(->str); But for dim=2, directly print in the function inside(->void | None)

    """
    if dim == 1:
        rounded_array = np.round(np_array)
        ep_str = []
        for elt in rounded_array:
            ep_str.append(f"{float(elt):.0f}")
        return " ".join(ep_str)
    elif dim == 2:
        rounded_array = np.round(np_array)
        for row in rounded_array:
            print(" ".join(map(str, row.astype(int))))
    else:
        print("Please check the dimension!")

def proceed_mat(mat_a: np.array, cmd: List[str]):
    mat = mat_a.copy()
    nx, ny = mat.shape
    if cmd[0] == "slice":
        r1, r2, c1, c2 = [int(i) for i in cmd[1:5]]
        sub_mat = mat[r1:r2+1, c1:c2+1]
        ep(sub_mat, dim=2)
        return mat
    elif cmd[0] == "stats":
        print("max: ", ep(np.max(mat, axis=1)))
        print("min: ", ep(np.min(mat, axis=1)))
        print("mean: ", ep(np.mean(mat, axis=1)))
        print("std: ", ep(np.std(mat, axis=1)))
        return mat
    elif cmd[0] in ("add", "substract", "multiply"):
        mat_b = np.zeros((int(cmd[1]), int(cmd[2])), dtype=np.int32)
        for i in range(int(cmd[1])):
            nums = input().split()
            mat_b[i] = np.array([int(i) for i in nums])
        if int(cmd[1]) != nx or int(cmd[2]) != ny:
            raise ValueError
        if cmd[0] == "add":
            ep(np.add(mat, mat_b), dim=2)
        elif cmd[0] == "substract":
            ep(np.subtract(mat, mat_b), dim=2)
        elif cmd[0] == "multiply":
            ep(np.multiply(mat, mat_b), dim=2)
        return mat
    elif cmd[0] == "update":
        mat_c = mat.copy()
        mat_c[int(cmd[1])][int(cmd[2])] = int(cmd[3])
        ep(mat_c, dim=2)
        return mat
    else:
        print("Please check the command input!")
        return mat


x, y = input().split()
x, y = int(x), int(y)
mat = np.zeros((x, y), dtype=np.int32)
# mat = np.zeros((x, y))
for i in range(x):
    nums = input().split()
    mat[i] = np.array([int(x) for x in nums])
n = int(input())
for i in range(n):
    try:
        cmd = input().split()
        mat = proceed_mat(mat, cmd)
    except ValueError as e:
        print("Wrong Matrix Shape")
