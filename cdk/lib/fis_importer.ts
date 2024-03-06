import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';
import * as cfninc from 'aws-cdk-lib/cloudformation-include';
import { json } from 'stream/consumers';

//Interace to pass to fis template importer
export interface FISTemplateImporterProps {
    fisTemplatePath: string;
    fisRoleARN: string;
    fisTags?: any;
    fisLogConfiguration?: any
    fisStopConditions?: any
}

//recursively update the first letter of each key in newTemplate to uppercase
function recursiveUppercaseKeys(obj: any, parentKey: string = "") {
    Object.keys(obj).forEach(function(key) {
        var newKey = key;
        if(["Targets","Actions","Parameters"].indexOf(parentKey) == -1)
        {
            newKey = key.charAt(0).toUpperCase() + key.slice(1);    
        }

        if (newKey !== key) {
            obj[newKey] = obj[key];
            delete obj[key];
        }
        if (typeof obj[newKey] === 'object') {
            recursiveUppercaseKeys(obj[newKey],newKey);
        }
    });
    return obj;
}

export class FISTemplateImporter extends Construct {

    constructor(scope: Construct, id: string, props: FISTemplateImporterProps) {
        super(scope, id);

        if(!props.fisTags)
        {
            props.fisTags = {"FIS-Ready": "True"}
        }

        const stack = cdk.Stack.of(this);
        const region = stack.region;
        const account = stack.account;

        const fs = require('fs');
        let fisTemplateJson = fs.readFileSync(props.fisTemplatePath, 'utf8');
        let rawTemplate = JSON.parse(fisTemplateJson);

        rawTemplate["roleArn"] = props.fisRoleARN

        //Override for stop conditions
        if(typeof props.fisStopConditions != 'undefined')
        {
            rawTemplate['stopConditions'] = props.fisStopConditions
        }
        else
        {   
            rawTemplate['stopConditions'] = [{ source: 'none' }]
        }
        
        //Override for log config
        if(JSON.stringify(props.fisLogConfiguration) != '{}')
        {
            rawTemplate['logConfiguration'] = props.fisLogConfiguration
        }
        else
        {
            delete rawTemplate['logConfiguration']
        }
  
        let newTemplate = {
            AWSTemplateFormatVersion: '2010-09-09',
            Resources:{
                FisExperiment: {
                    Type: 'AWS::FIS::ExperimentTemplate',
                    Properties: rawTemplate
                }
            }
        }

        newTemplate = recursiveUppercaseKeys(newTemplate)

        //now we gotta go back and fix the targets :/ 
        Object.keys(newTemplate.Resources.FisExperiment.Properties.Targets).forEach(function(key) {
           
            //While we're here we should remove all resources ARNs from the targets
            delete newTemplate.Resources.FisExperiment.Properties.Targets[key].ResourceArns

            //lets also ensure override any tags. If null we'll pass FisReady = True
            newTemplate.Resources.FisExperiment.Properties.Targets[key].ResourceTags = props.fisTags

        })

        //Loop to inspect actions
        Object.keys(newTemplate.Resources.FisExperiment.Properties.Actions).forEach(function(key) {
            
            //if we detect an SSM doc, we'll format the ARN to force the current region.
            // doing this in a try catch since testing nested parameters is weird
            try{
                if(newTemplate.Resources.FisExperiment.Properties.Actions[key].Parameters.documentArn != undefined)
                {
                    var docName = newTemplate.Resources.FisExperiment.Properties.Actions[key].Parameters.documentArn.split(':').slice(-1)[0]
                    newTemplate.Resources.FisExperiment.Properties.Actions[key].Parameters.documentArn = `arn:aws:ssm:${region}:${account}:${docName}`
                }
            }
            catch{
                //do nothing since prop doesnt exist
            }

        })

        let fisTemplatePath = props.fisTemplatePath.split('/')
        let fisTemplateName = fisTemplatePath[fisTemplatePath.length - 1]
        let modifiedTemplatePath = "cdk.out/" + fisTemplateName

        //save newTemplate to a file in the cdkout folder
        fs.writeFileSync(modifiedTemplatePath, JSON.stringify(newTemplate, null, 2));
        
        const template = new cfninc.CfnInclude(this, 'FISTemplate', {
            templateFile: modifiedTemplatePath,
            preserveLogicalIds: false
        })
    }
}

