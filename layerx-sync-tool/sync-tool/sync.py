# Script to download images and text files to local machine and generate path file
import requests
import json
import csv
import os
import sys
from multiprocessing.pool import ThreadPool
import time

# IP+port or url of the server # (eg: https://qa.deepzea.com)
serverUrl = 'http://localhost/'

dataDirectoryName = 'testData' # folder to download image and text files
dataDirectoryPath = f'./{dataDirectoryName}'

localPathDict = {}
failedDownloadsPresent = False

# Method to download files
# @params: pathIdentifier=(name to save the file), url=(URL to file)
def downloadFile(pathIdentifier, url):
    # download files from newly added paths
    print('Downloading file '+pathIdentifier)
    r = requests.get(url, timeout=25)
    downloadPath = f'./{dataDirectoryName}/'+ pathIdentifier
    with open(downloadPath, 'wb') as f:
        f.write(r.content)

# get variables from cmd
cmd_args = sys.argv

# get dataset url data from server
baseUrl = f'{serverUrl}/api/datasetVersion/getVersionData/' 

if(len(cmd_args)!=4):
    print(f"Required 3 arguments but recived {len(cmd_args)-1}")
    print("arguments: <group name> <version number> <access token>")
    quit()
uniqueGroupName = cmd_args[1]
callUrl = baseUrl+uniqueGroupName+'/'

versionNo = cmd_args[2]
callUrl = callUrl + versionNo

access_token = cmd_args[3]  

# method to get item URL list from layerX (per page)
# # @params - callUrl=(Url to get itemlist of given group and version from layerx), payload=(pageNo,pageSize)
# @returns - response=(response from layerX containing URL list) 
def getDataFromServer(callUrl, payload):
    # Get the url list of dataset items from node backend
    hed = {'Authorization': 'Bearer ' + access_token}
    try:
        callResponse = requests.get(callUrl, params=payload, headers=hed, timeout=10)
    except:
        print(f'Error connecting to layerx')
        print("We are facing a problem with the network, please retry to download missing items")
        quit()
    response = callResponse.json()
    return response

# handle download for a single dataset item (image and textfile)
# @params: arg_list=[val=(itemUrl), currentPath=(current location path), identifier=(unique identifier name for the dataset version)]
# @returns: {False<when download failed>, arg_list<from params>}
#       or  {True<when download success>, 
#                   {   (formattedWriteKey=(path identifier of downloaded file) or None=<if file already existed> ),
#                       textFileImagePathData={imagePath=(file path of downloaded item), pathFileName=("training path file" name - stores paths of downloaded images used for training)}
#                    }
#               }
def handleOneDownload(arg_list):
    val = arg_list[0]
    currentPath = arg_list[1]
    identifier = arg_list[2]

    formattedWriteKey = val['path']
    imagePath = os.path.abspath(f'./{dataDirectoryName}/'+ val['imageIdentifier'])

    pathFileName = f"{identifier}.txt"

    textFileImagePathData = (imagePath, pathFileName)

    if(localPathDict.get(formattedWriteKey)==None):

        # download files
        try:
            if "imageUrl" in val:
                downloadFile(val['imageIdentifier'],val['imageUrl']) # download image
            if "textUrl" in val:
                downloadFile(val['textIdentifier'],val['textUrl']) # download text file  
        except Exception as e:
            print(f'Error downloading - {formattedWriteKey}') 
            return (False, arg_list)

        # If item is not available in the syncdatafile (file hasn't downloaded before)
        print('Downloded item - '+ formattedWriteKey)

        # add to download list
        localPathDict[formattedWriteKey] = val['imageUrl']
        
        # return formattedWriteKey to update the syncdatafile csv
        return (True, (formattedWriteKey, textFileImagePathData))

    else:
        print('Item already exists, OK') 
        return (True, (None, textFileImagePathData))

# main method to download items and update datafiles
# @params: dataList=(response from layerX containing URL list)
def updateVersionData(dataList):
    # create master csv file if not existing
    with open('syncDataFile.csv', "a+") as csv_readfile:
        print("check syncDataFile.csv")
    # read master csv
    with open('syncDataFile.csv') as csv_readfile:
        reader = csv.reader(csv_readfile)
        localPathDictTemp = dict(reader)

    global localPathDict
    global failedDownloadsPresent

    localPathDict = localPathDictTemp

    currentPath = os.getcwd()

    arg_list = []
    for val in dataList['resourceArray']:
        arg_list.append([val, currentPath, dataList['identifier']])

    # Download items in parallel
    print("starting page download")
    with ThreadPool(20) as p:
        for res in p.imap(handleOneDownload, arg_list):

            isDownloded = res[0]
            downloadData = res[1]
            if not isDownloded:
                # try again to download the failed download
                print(f"Retrying Download - {downloadData[0]['path']}")
                res = handleOneDownload(downloadData)
                isDownloded = res[0]
                downloadData = res[1]

            if isDownloded:
                #if file is downloaded, write it to master csv
                fileDataKey = downloadData[0]
                textFileImagePathData = downloadData[1]
                if fileDataKey is not None: 
                    # write to pathList when formattedWriteKey is returned from parallel processing
                    with open('syncDataFile.csv', 'a+', newline='') as csv_file:  
                        writer = csv.writer(csv_file) 
                        writer.writerow([fileDataKey, 1]) 
                if textFileImagePathData is not None:
                    # write image file path to train text file
                    imagePath = textFileImagePathData[0]
                    pathFileName = textFileImagePathData[1]
                    with open(pathFileName, 'a+', newline='') as train_txt_file:
                        train_txt_file.write(imagePath + "\n")
                    p.close()
            else:
                print(f"Retrying Failed! - {downloadData[0]['path']}")
                failedDownloadsPresent = True
                p.close()

    print("page download done")
       

# method to get url list from server and execute the main script for all pages
# @params - callUrl (Url to get itemlist of given group and version from layerx), pageNo
def getAllPages(callUrl, pageNo):
    payload = {'pageNo': pageNo, 'pageSize': 250}
    response = getDataFromServer(callUrl, payload)
    print('Downloading page no: '+ str(pageNo))
    if "identifier" in response:
        if pageNo == 1:
            # clear the data in the train text file on init
            pathFileName = f"{response['identifier']}.txt"
            tempfile = open(pathFileName,"w")
            tempfile.close()
        updateVersionData(response)
        # recursively call this again to get next page
        if(response['nextPage']==True):
            nextPageNo = int(pageNo)+1
            getAllPages(callUrl, nextPageNo)
        print("Download Complete")
        if failedDownloadsPresent:
            print("Unfortunately we failed to download everything, please retry to download missing items")
        quit()
    else:
        print("No data recieved from remote for given group and/or version")
        
# main script below
def main():
    #create required files and directories
    if not os.path.exists(dataDirectoryPath):
        os.makedirs(dataDirectoryPath)
        print(f"Created {dataDirectoryName} folder")

    # start operation
    getAllPages(callUrl, 1)

# run main method
main()
# ---------------


# sample run command:
# python3 sync.py <group name> <version number> <auth token>