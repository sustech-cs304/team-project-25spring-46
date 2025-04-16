if(NULL!=p1){
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
free(p1);
p1=NULL;
}
#include<stdio.h>  //demo.c
#include<stdlib.h>

*p1=0x12345678;
int main(int argc, char*argv[]){
int *p1=(int*)malloc(sizeof(int));
if(NULL!=p1){
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
free(p1);
p1=NULL;
}
int main(int argc, char*argv[]){
int *p1=(int*)malloc(sizeof(int));
if(NULL!=p1){
*p1=0x12345678;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
free(p1);
p1=NULL;
}
