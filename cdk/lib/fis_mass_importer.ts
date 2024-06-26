import { Construct } from 'constructs';
import { fisTemplateImporter } from './fis_importer';

//Interace to pass to fis template importer
export interface fisMassTemplateImporterProps {
    fisTemplateFolderPath: string;
    fisRoleARN: string;
    fisTags?: any;
    fisLogConfiguration?: any
    fisStopConditions?: any
}

export class fisMassTemplateImporter extends Construct {

    constructor(scope: Construct, id: string, props: fisMassTemplateImporterProps) {
        super(scope, id);

        //get a list of all files in 
        const fs = require('fs');
    
        let files = fs.readdirSync(props.fisTemplateFolderPath);
    
       //loop for each file
       for (let i = 0; i < files.length; i++) {
        
        //get the file name
        let fileName = files[i];
        
        //get the file path
        let filePath = props.fisTemplateFolderPath + '/' + fileName;
        
        new fisTemplateImporter(this, `${fileName}Importer`, {
            fisTemplatePath: filePath,
            fisRoleARN: props.fisRoleARN,
            fisTags: props.fisTags,
            fisLogConfiguration: props.fisLogConfiguration,
            fisStopConditions: props.fisStopConditions
          });
        }
    }
}