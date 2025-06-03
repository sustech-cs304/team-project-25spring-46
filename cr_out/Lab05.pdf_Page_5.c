#include<stdio.h>   //demo1.c
#include<stdlib.h>

#include<stdio.h>   //demo2.c
#include<stdlib.h>

*p1=0x12345678;
int main(intargc, char* argv[]){
int *p1=(int*)malloc(sizeof(int));
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
int main(intargc, char* argv[]){
int d1=0x12345678;
int *p1=&d1;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
int main(intargc, char* argv[]){
int *p1=(int*)malloc(sizeof(int));
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
int main(intargc, char* argv[]){
int d1=0x12345678;
int *p1=&d1;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
