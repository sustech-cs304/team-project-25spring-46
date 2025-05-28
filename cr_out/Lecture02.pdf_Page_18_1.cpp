Fixed width integer types (since C++11)
Defined in <cstdint>
int8_t
int16_t
int32_t
int64_t
uint8_t
uint16_t
uint32_t
uint64_t
...
Some useful macros 
INT8_MIN
INT16_MIN
INT32_MIN
INT64_MIN
INT8_MAX
INT16_MAX
INT32_MAX
INT64_MAX
...
#include <iostream>
#include <cstdint>
using namespace std;
int main()
{
cout << "INT8_MAX=" << INT8_MAX << endl;
}