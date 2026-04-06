# 🔐 EC2 HARDENED — Imagen base + User Data + Permisos Mínimos

# ✅ Buscar AMI Ubuntu 22.04 LTS (actualizada)
data "aws_ami" "ubuntu_latest" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ✅ IAM Role — Mínimo privilegio (solo ECR pull + SSM)
resource "aws_iam_role" "teshlex_ec2_role" {
  name_prefix = "teshlex-ec2-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "teshlex-ec2-role"
  }
}

# 🔐 Política ESPECÍFICA: Solo pull de ECR para TeshLex
resource "aws_iam_role_policy" "teshlex_ecr_pull_only" {
  name_prefix = "teshlex-ecr-pull-"
  role        = aws_iam_role.teshlex_ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRPullTeshLexOnly"
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = "arn:aws:ecr:${var.aws_region}:ACCOUNT_ID:repository/teshlex/*"
      },
      {
        Sid    = "ECRAuthToken"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchPutMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "TeshLex"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "teshlex_ssm_managed_instance_core" {
  role       = aws_iam_role.teshlex_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "teshlex_ec2" {
  name_prefix = "teshlex-ec2-"
  role        = aws_iam_role.teshlex_ec2_role.name
}

# 🔐 USER DATA — Hardening script (ejecutado como root al boot)
locals {
  user_data_script = base64encode(templatefile("${path.module}/../devops/hardening/ec2-userdata.sh", {
    k3s_version = "v1.29.2"
    docker_dir  = "/var/lib/docker"
    app_user    = "appuser"
  }))
}

# 🔐 EC2 Instance — Hardened
resource "aws_instance" "teshlex" {
  ami           = data.aws_ami.ubuntu_latest.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.teshlex_deploy.key_name

  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.teshlex_web.id]
  iam_instance_profile        = aws_iam_instance_profile.teshlex_ec2.name
  associate_public_ip_address = var.associate_public_ip

  # 🔐 Encripción EBS
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    encrypted             = var.root_volume_encryption_enabled
    kms_key_id            = aws_kms_key.teshlex_ebs.arn
    delete_on_termination = true
  }

  # 🔐 IMDSv2 ONLY (protección contra SSRF attacks)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # ← IMDSv2 obligatorio
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "disabled"
  }

  # 🔐 Monitoreo detallado
  monitoring = var.enable_detailed_monitoring

  # 🔐 User Data (hardening + k3s + docker)
  user_data = local.user_data_script

  credit_specification {
    cpu_credits = "unlimited"  # Burst permitido en free tier
  }

  tags = {
    Name = "teshlex-app-${var.environment}"
  }

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

# 🔐 Elastic IP (para DDNS o conexión SSH estable)
resource "aws_eip" "teshlex" {
  count    = var.enable_eip ? 1 : 0
  instance = aws_instance.teshlex.id
  domain   = "vpc"

  tags = {
    Name = "teshlex-eip-${var.environment}"
  }

  depends_on = [aws_internet_gateway.main]
}

# 🔐 SSH Key Pair (reemplazar con tu clave pública)
resource "aws_key_pair" "teshlex_deploy" {
  key_name_prefix = "teshlex-deploy-"
  public_key      = file("${path.module}/../devops/security/teshlex-deploy.pub")  # ← GENERAR CON ssh-keygen

  tags = {
    Name = "teshlex-deploy-key"
  }
}

# ─────────────────────────────────────────────────────────────────────

# Outputs para DDNS / conexión
output "teshlex_eip" {
  value       = try(aws_eip.teshlex[0].public_ip, aws_instance.teshlex.public_ip)
  description = "Elastic IP o Public IP de TeshLex (para DDNS)"
}

output "teshlex_instance_id" {
  value       = aws_instance.teshlex.id
  description = "EC2 Instance ID"
}

output "teshlex_ssh_command" {
  value = "ssh -i devops/security/teshlex-deploy -p 2222 devsecops@${try(aws_eip.teshlex[0].public_ip, aws_instance.teshlex.public_ip)}"
  description = "Comando para conectar vía SSH"
}
