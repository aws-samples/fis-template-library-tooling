import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { fisTemplateImporter } from './fis_importer';
import { fisIamRole } from './fis_role';
import { fisMassTemplateImporter } from './fis_mass_importer';
import {ssmDoc} from './ssm_doc_importer';

export class FisDeploymentStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import local IAM policy 
    const fisRole = new fisIamRole(this, 'FisRole', {
      IamPolicyTemplatePath: "lib/iam_policy.json"
    })

    // Creates CloudWatch Log Group
    const linuxTestLogGroup = new logs.LogGroup(this,'LinuxTestLogGroup')

    // Stop Condition Sample
    // Create Metric
    const metric = new cloudwatch.Metric({
      namespace: 'MyNamespace',
      metricName: 'MyMetric',
      dimensionsMap: { MyDimension: 'MyDimensionValue' }
    });

    // Create alarm
    const alarm = new cloudwatch.Alarm(this, 'Alarm', {
      metric: metric,
      threshold: 100,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });

    const aurora_cluster_failover = new fisTemplateImporter(this, 'aurora-cluster-failover', {
      
      // Path to Experiment file
      fisTemplatePath: 'fis_templates/aurora-cluster-failover.json',
      
      // IAM role used by the FIS experiment to take action on resources 
      fisRoleARN: fisRole.role.roleArn,
      
      // Tags used to target resources in AWS
      fisTags: {
        "FIS-Ready": "True"
      },

      // CloudWatch log Configuration 
      fisLogConfiguration: {
        "cloudWatchLogsConfiguration": {
          "logGroupArn": linuxTestLogGroup.logGroupArn
        },
        "logSchemaVersion": 1
      },

      // Stop condition to terminate experiment 
      fisStopConditions:[{
        "source": "aws:cloudwatch:alarm",
        "value": alarm.alarmArn
      }],

      // Tags to apply to experiment
      fisExperimentTags: {"Name": "aurora-cluster-failover"}
    });
  }
}
