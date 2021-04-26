/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

 import * as path from 'path';

 export type ProjectInfo = {
   name: string;
   path: string;
   isWorkspace: boolean;
 };
 
 function findXcodeProject(files: Array<string>): ProjectInfo | null {
   const sortedFiles = files.sort();
   for (let i = sortedFiles.length - 1; i >= 0; i--) {
     const fileName = files[i];
     const file = path.parse(fileName);
     const ext = file.ext;

     if (ext === '.xcworkspace') {
       return {
         name: file.name,
         path:fileName,
         isWorkspace: true,
       };
     }
     if (ext === '.xcodeproj') {
       return {
         name: file.name,
         path:fileName,
         isWorkspace: false,
       };
     }
   }
 
   return null;
 }
 
 export default findXcodeProject;
 