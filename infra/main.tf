# infra/main.tf — TeshLex Infrastructure
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend remoto para estado (descomenta en producción)
  # backend "s3" {
  #   bucket = "teshlex-tfstate"
  #   key    = "global/s3/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}
