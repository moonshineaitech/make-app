import sys
from appdock_example import total
print("APPDOCK_SUM="+str(total(map(int,sys.argv[1:]))))
