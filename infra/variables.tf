variable "aws_region" {
  description = "Región de AWS para desplegar"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Entorno: dev, staging, prod"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "teshlex"
}

variable "vpc_cidr" {
  description = "CIDR del VPC principal"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR de la subnet pública"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "AZ principal"
  type        = string
  default     = "us-east-1a"
}

variable "instance_type" {
  description = "Tipo de instancia EC2 (t2.micro = Free Tier)"
  type        = string
  default     = "t2.micro"
}

variable "ami_id" {
  description = "AMI Ubuntu 22.04 LTS us-east-1"
  type        = string
  default     = "ami-0c7217cdde317cfec"
}

variable "ssh_public_key_path" {
  description = "Ruta a la llave pública SSH local"
  type        = string
  default     = "~/.ssh/teshlex-aws.pub"
}

variable "ssh_allowed_cidr" {
  description = "CIDR permitido para SSH — DEBE ser tu IP pública (x.x.x.x/32) o range pequeño"
  type        = string
  default     = "0.0.0.0/0"
  
  validation {
    condition     = can(cidrhost(var.ssh_allowed_cidr, 0))
    error_message = "ssh_allowed_cidr debe ser un CIDR válido (ej: 203.0.113.45/32)."
  }
}

variable "admin_email" {
  description = "Email del administrador (para alertas, ACLs, auditoría)"
  type        = string
  default     = "admin@teshlex.local"
}

variable "enable_ebs_encryption" {
  description = "Encriptar los volúmenes EBS de EC2"
  type        = bool
  default     = true
}

variable "enable_s3_tfstate_backend" {
  description = "Si true, crea bucket S3 para Terraform state (con versionado + encripción)"
  type        = bool
  default     = false
}
