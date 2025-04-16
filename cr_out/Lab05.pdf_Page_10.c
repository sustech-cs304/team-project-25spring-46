#include <stdio.h>  //dangling_pointer
#include <stdlib.h>

*p1 = 0x12345678;
*p1 = 0x78563421;
int main(int argc, char*argv[]){
int *p1 = (int*) malloc(sizeof(int)*1);
*p1 = 0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
free(p1);
*p1 = 0x78563421;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return 0;
}
int main(int argc, char*argv[]){
int *p1 = (int*) malloc(sizeof(int)*1);
*p1 = 0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
free(p1);
*p1 = 0x78563421;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return 0;
}
