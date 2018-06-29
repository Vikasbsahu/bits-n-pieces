import csv
import pymongo
import sys
import datetime

# true to leave NULLs as explicit nulls in MongoDB
# false to remove NULL value columns from inserted record
insertNullFields=False 

conn = pymongo.MongoClient(port=27017)
db = conn.output  # dbname
docs = db.newout  # collection name

datafile = sys.argv[1:][0]
nReader = csv.DictReader(open(datafile, "r"), delimiter=',')

counter=0
prevCount = 0
for line in nReader:
   line['tRunning']=counter
   counter=counter+1
   line['currCount']=int(line['count'])-prevCount
   prevCount=int(line['count'])
   line['op']=datafile.split('/')[-1].split('.')[0]
   line['run']=datafile.split('/')[0]+"_"+datafile.split('/')[1]
   for k,v in line.items():
      i=v
      if isinstance(v, basestring) and v.find(".")>0:
          try:
              i=float(v)
              # print k, " is now float", i
              line[k]=i
              continue
          except:
              # print "not any float"
              pass
      else:
          try:
              i=int(v)
              # print k, " is now int", i
              line[k]=i
              continue
          except:
              # print "not any int"
              pass
   # print '******************'
   # print line
   docs.save(line)
