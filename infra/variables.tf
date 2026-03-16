variable "aws_region" {
  description = "Región de AWS para desplegar"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Entorno: dev, staging, prod"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "teshlex"
}
