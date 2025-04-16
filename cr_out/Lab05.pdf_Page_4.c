#include<stdio.h>   //wild_pointer.c
#include<stdlib.h>

#include<stdio.h>   //wild_pointer.c
#include<stdlib.h>

*p1=0x12345678;
*p1=NULL;
*p1=0x12345678;
int main(intargc, char* argv[]){
int*p1;
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
int main(int argc, char* argv[]){
int *p1=NULL;
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
int main(intargc, char* argv[]){
int*p1;
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
int main(int argc, char* argv[]){
int *p1=NULL;
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
return0;
}
