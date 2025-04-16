#include <stdio.h>  //free less
#include <stdlib.h>

#include <stdio.h>    //free more
#include <stdlib.h>

*p1=0x12345678;
*p1=0x12345678;
*p2 = p1;
int main(int argc, char*argv[]){
int *p1 = malloc(sizeof(int)*1);
int *p2 = malloc(sizeof(int)*1);
*p1=0x12345678;
*p2=*p1;
printf("p1:%p\tdata:0x%x\n
p2:%p\tdata:0x%x\n",p1,*p1,p2,*p2);
free(p1);
return 0;
}
int main(int argc, char*argv[]){
int *p1 = malloc(sizeof(int)*1);
*p1=0x12345678;
int *p2 = p1;
printf("p1:%p\tdata:0x%x\n
p2:%p\tdata:0x%x\n",p1,*p1,p2,*p2);
free(p1);
free(p2);
return 0;
}
int main(int argc, char*argv[]){
int *p1 = malloc(sizeof(int)*1);
int *p2 = malloc(sizeof(int)*1);
*p1=0x12345678;
*p2=*p1;
printf("p1:%p\tdata:0x%x\n
p2:%p\tdata:0x%x\n",p1,*p1,p2,*p2);
free(p1);
return 0;
}
int main(int argc, char*argv[]){
int *p1 = malloc(sizeof(int)*1);
*p1=0x12345678;
int *p2 = p1;
printf("p1:%p\tdata:0x%x\n
p2:%p\tdata:0x%x\n",p1,*p1,p2,*p2);
free(p1);
free(p2);
return 0;
}
