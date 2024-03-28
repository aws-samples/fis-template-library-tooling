import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cfninc from 'aws-cdk-lib/cloudformation-include';
import * as fs from 'fs';
import * as request from 'sync-request';

// Interface to pass to FIS template importer
export interface FISTemplateImporterProps {
    fisTemplatePath: string;
    fisRoleARN: string;
    fisTags?: any;
    fisLogConfiguration?: any;
    fisStopConditions?: any;
    fisExperimentTags?: any;
}

// Recursively update the first letter of each key in newTemplate to uppercase
function recursiveUppercaseKeys(obj: any, parentKey: string = "") {
    Object.keys(obj).forEach(function(key) {
        var newKey = key;
        if(["Targets","Actions","Parameters","Tags"].indexOf(parentKey) == -1) {
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

        if(!props.fisTags) {
            props.fisTags = {"FIS-Ready": "True"};
        }

        const stack = cdk.Stack.of(this);
        const region = stack.region;
        const account = stack.account;

        const DownloadGitFile = (): string => {
            const metadataUrl = props.fisTemplatePath;
            const releaseMetadata = JSON.parse(
              request.default('GET', metadataUrl, {
                headers: {
                  'User-Agent': 'CDK' // GH API requires us to set UA
                }
              }).getBody().toString()
            );
            return releaseMetadata;
        }

        let rawTemplate: any;

        if (props.fisTemplatePath.startsWith('http://') || props.fisTemplatePath.startsWith('https://')) {
            rawTemplate = DownloadGitFile();
        } else {
            let fisTemplateJson = fs.readFileSync(props.fisTemplatePath, 'utf8');
            rawTemplate = JSON.parse(fisTemplateJson);
        }

        processTemplate.call(this, rawTemplate);

        function processTemplate(this: FISTemplateImporter, rawTemplate: any) {
            rawTemplate["roleArn"] = props.fisRoleARN;
        
            // Override for stop conditions
            if(typeof props.fisStopConditions != 'undefined') {
                rawTemplate['stopConditions'] = props.fisStopConditions;
            } else {   
                rawTemplate['stopConditions'] = [{ source: 'none' }];
            }
            
            // Override for log config
            if(JSON.stringify(props.fisLogConfiguration) != '{}') {
                rawTemplate['logConfiguration'] = props.fisLogConfiguration;
            } else {
                delete rawTemplate['logConfiguration'];
            }
            
            // Override for experiment Tags
            if (props.fisExperimentTags !== undefined && Object.keys(props.fisExperimentTags).length !== 0) {
                console.log("tags found")
                rawTemplate['tags'] = props.fisExperimentTags;
            } else {
                // Set the file name as the value for the "Name" key if no tag is specified.
                let fileName;
                const pathParts = props.fisTemplatePath.split('/');
                fileName = pathParts[pathParts.length - 1];
                fileName = fileName.substring(0, fileName.length - 5); // Trim ".json" extension
                rawTemplate['tags'] = { "Name": fileName }; 
            }
        
            let newTemplate = {
                AWSTemplateFormatVersion: '2010-09-09',
                Resources:{
                    FisExperiment: {
                        Type: 'AWS::FIS::ExperimentTemplate',
                        Properties: rawTemplate
                    }
                }
            };
        
            newTemplate = recursiveUppercaseKeys(newTemplate);
        
            // Now we gotta go back and fix the targets
            Object.keys(newTemplate.Resources.FisExperiment.Properties.Targets).forEach(function(key) {
                // While we're here we should remove all resources ARNs from the targets
                delete newTemplate.Resources.FisExperiment.Properties.Targets[key].ResourceArns;
        
                // Let's also ensure to override any tags. If null we'll pass FisReady = True
                newTemplate.Resources.FisExperiment.Properties.Targets[key].ResourceTags = props.fisTags;
            });

            // Loop to inspect actions
            Object.keys(newTemplate.Resources.FisExperiment.Properties.Actions).forEach(function(key) {
                // If we detect an SSM doc, we'll format the ARN to force the current region.
                // Doing this in a try-catch since testing nested parameters is weird
                try {
                    if(newTemplate.Resources.FisExperiment.Properties.Actions[key].Parameters.documentArn != undefined) {
                        var docName = newTemplate.Resources.FisExperiment.Properties.Actions[key].Parameters.documentArn.split(':').slice(-1)[0];
                        newTemplate.Resources.FisExperiment.Properties.Actions[key].Parameters.documentArn = `arn:aws:ssm:${region}:${account}:document/${docName}`;
                    }
                } catch {
                    // Do nothing since prop doesn't exist
                }
            });
        
            let fisTemplatePath = props.fisTemplatePath.split('/');
            let fisTemplateName = fisTemplatePath[fisTemplatePath.length - 1];
            let modifiedTemplatePath = "cdk.out/" + fisTemplateName;
        
            // Save newTemplate to a file in the cdkout folder
            fs.writeFileSync(modifiedTemplatePath, JSON.stringify(newTemplate, null, 2));
            
            const template = new cfninc.CfnInclude(this, 'FISTemplate', {
                templateFile: modifiedTemplatePath,
                preserveLogicalIds: false
            });
        }
        
    }
}
