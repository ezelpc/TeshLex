# 🔐 VARIABLES SEGURAS — Mínimo Privilegio

variable "ssh_allowed_cidr" {
  description = "⚠️ CRÍTICO: Restricción de IP para SSH. REEMPLAZA con tu IP: 'x.x.x.x/32'"
  type        = string
  default     = "0.0.0.0/32"  # ← CAMBIAR A TU IP PÚBLICA
  
  validation {
    condition     = can(regex("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}/\\d{1,2}$", var.ssh_allowed_cidr))
    error_message = "ssh_allowed_cidr debe ser un CIDR válido (ej: 192.168.1.100/32)"
  }
}

variable "enable_eip" {
  description = "Asignar Elastic IP para DDNS"
  type        = bool
  default     = true
}

variable "enable_imds_v2_only" {
  description = "Obligar IMDSv2 (más seguro que IMDSv1)"
  type        = bool
  default     = true
}

variable "enable_detailed_monitoring" {
  description = "CloudWatch detailed monitoring"
  type        = bool
  default     = true
}

variable "root_volume_encryption_enabled" {
  description = "Encriptar volumen EBS raíz"
  type        = bool
  default     = true
}

variable "associate_public_ip" {
  description = "Asociar IP pública en subnet (será accesible via Elastic IP)"
  type        = bool
  default     = true
}
