#include <stdio.h>
#include <stdlib.h>

*p1=NULL;
int main(int argc, char*argv[]){
int *p1=NULL;
int d1=0x12345678;
p1 = &d1;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
free(p1);
return 0;
}
int main(int argc, char*argv[]){
int *p1=NULL;
int d1=0x12345678;
p1 = &d1;
printf("address: %p\tdata: 0x%x\n",p1,*p1);
free(p1);
return 0;
}
