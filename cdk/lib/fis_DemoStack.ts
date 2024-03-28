import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { FISTemplateImporter } from './fis_importer';
import { FisIamRole } from './fis_role';
import { FISMassTemplateImporter } from './fis_mass_importer';
import {SsmDoc} from './ssmDoc';

export class FisDemoStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import local IAM policy 
    const fisRole = new FisIamRole(this, 'FisRole', {
      IamPolicyTemplatePath: "lib/iam_policy.json"
    })
  
    // Import IAM policy from git
    const remotefisRole = new FisIamRole(this, 'remoteFisRole', {
      IamPolicyTemplatePath: "https://raw.githubusercontent.com/awshans/aws-fault-injection-simulator-samples/main/aurora-cluster-failover/aurora-cluster-failover-iam-policy.json"
    })

    const linuxTestLogGroup = new logs.LogGroup(this,'LinuxTestLogGroup')

    //const linuxTest = new FISTemplateImporter(this, 'Linuxtest', {
    //  fisTemplatePath: 'fis_templates/linux-srv-latency.json',
    //  fisRoleARN: fisRole.role.roleArn,
    //  fisTags: {
    //    "FIS-Ready": "True"
    //  },
    //  fisLogConfiguration: {
    //   "cloudWatchLogsConfiguration": {
    //      "logGroupArn": linuxTestLogGroup.logGroupArn
    //    },
    //    "logSchemaVersion": 1
    //  }
    //});

    //Stop Condition Sample
    const metric = new cloudwatch.Metric({
      namespace: 'MyNamespace',
      metricName: 'MyMetric',
      dimensionsMap: { MyDimension: 'MyDimensionValue' }
    });

    const alarm = new cloudwatch.Alarm(this, 'Alarm', {
      metric: metric,
      threshold: 100,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });

    //const app1 = new FISTemplateImporter(this, 'App1', {
    //  fisTemplatePath: 'fis_templates/app-1-test.json',
    //  fisRoleARN: fisRole.role.roleArn,
    //  fisStopConditions:[{
    //    "source": "aws:cloudwatch:alarm",
    //    "value": alarm.alarmArn
    //  }]
    // });

    const aurora = new FISTemplateImporter(this, 'Aurora', {
      //fisTemplatePath: 'fis_templates/aurora-cluster-failover.json',
      fisTemplatePath: 'https://raw.githubusercontent.com/awshans/aws-fault-injection-simulator-samples/main/aurora-cluster-failover/aurora-cluster-failover-template.json',
      fisRoleARN: fisRole.role.roleArn,
      fisTags: {
        "FIS-Ready": "True",
        "Application": "myApp",
        "Environment": "dev"
      },
      fisExperimentTags: {"Name": "aurora-cluster-failover"}
    });

    const ec2_terminate = new FISTemplateImporter(this, 'ec2_terminate', {
      fisTemplatePath: 'https://raw.githubusercontent.com/awshans/aws-fault-injection-simulator-samples/main/ec2-instances-terminate/ec2-instances-terminate-template.json',
      fisRoleARN: fisRole.role.roleArn,
      fisTags: {
        "FIS-Ready": "True",
        "Application": "myApp",
        "Environment": "dev"
      },
      //fisExperimentTags: {"Name": "ec2-terminate-instances"}
    });

    //const massImport = new FISMassTemplateImporter(this, 'MassImport', {
    //  fisTemplateFolderPath: 'fis_masstemplate_demo/',
    //  fisRoleARN: fisRole.role.roleArn
    //})

    //SSM Sample
    //const ssmDocStopWindowsService = new SsmDoc(this, 'SsmDocStopWindowsService', {
    //  docPath: 'ssm_templates/StopWindowsService.json',
    //  docName: 'StopWindowsService',
    //  docVersion: '1'
    //})

  }
}
