#include<stdio.h>   //memory_leak.c
#include<stdlib.h>

*p1=0x12345678;
int main(int argc, char*argv[]){
int *p1=(int*)malloc(sizeof(int));
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
int main(int argc, char*argv[]){
int *p1=(int*)malloc(sizeof(int));
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
