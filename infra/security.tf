# 🔐 SECURITY GROUP — Hardening Ports & Rules

resource "aws_security_group" "teshlex_web" {
  name_prefix = "teshlex-web-"
  description = "TeshLex: HTTP/HTTPS + SSH restrictivo"
  vpc_id      = aws_vpc.main.id

  # ✅ HTTP → Redirige a HTTPS (solo para Let's Encrypt)
  ingress {
    description     = "HTTP para ACME Let's Encrypt"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    cidr_blocks     = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # ✅ HTTPS — Tráfico encriptado
  ingress {
    description      = "HTTPS — Tráfico seguro"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # 🔴 SSH — RESTRINGIDO solo a tu IP
  ingress {
    description = "SSH en puerto 2222 — SOLO TU IP (${var.ssh_allowed_cidr})"
    from_port   = 2222
    to_port     = 2222
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr != "0.0.0.0/32" ? var.ssh_allowed_cidr : "203.0.113.0/31"]  # Dummy IP si no configurado
  }

  # ✅ Egress — Permitir todo outbound (necesario para apt, pip, docker pull)
  egress {
    description     = "Permitir egress a internet"
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "teshlex-web-sg"
  }
}

resource "aws_security_group" "teshlex_bastion_locked" {
  name_prefix = "teshlex-bastion-locked-"
  description = "Emergencia: SSH backdoor (1 use case crítico)"
  vpc_id      = aws_vpc.main.id

  # Solo desde Bastion (simulación de DMZ)
  ingress {
    description    = "SSH desde Bastion interno"
    from_port      = 22
    to_port        = 22
    protocol       = "tcp"
    security_groups = [aws_security_group.teshlex_web.id]
  }

  egress {
    description = "Permitir egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "teshlex-bastion-locked-sg"
  }
}

# ✅ KMS Key para encriptar datos en reposo
resource "aws_kms_key" "teshlex_ebs" {
  description             = "Encriptación EBS/RDS para TeshLex"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "teshlex-ebs-key"
  }
}

resource "aws_kms_alias" "teshlex_ebs" {
  name          = "alias/teshlex-ebs"
  target_key_id = aws_kms_key.teshlex_ebs.key_id
}

# ──────────────────────────────────────────────────────────────────────────────
# 🔐 IAM ROLE para EC2 — Mínimo Privilegio
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "ec2_role" {
  name_prefix = "${var.project_name}-ec2-role-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = { Name = "${var.project_name}-ec2-role" }
}

# ──────────────────────────────────────────────────────────────────────────────
# ECR Pull Policy — Docker images
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "ecr_pull_policy" {
  name_prefix = "${var.project_name}-ecr-pull-"
  role        = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "ECRPullAuthorization"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
        ]
        Resource = "*"
      },
      {
        Sid = "ECRDescribe"
        Effect = "Allow"
        Action = [
          "ecr:DescribeImages",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
        ]
        Resource = "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.account.account_id}:repository/${var.project_name}*"
      }
    ]
  })
}

# ──────────────────────────────────────────────────────────────────────────────
# CloudWatch Logs — Monitoreo centralizado
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "cloudwatch_logs_policy" {
  name_prefix = "${var.project_name}-cw-logs-"
  role        = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "CloudWatchLogsAccess"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.account.account_id}:log-group:/teshlex/*"
      }
    ]
  })
}

# ──────────────────────────────────────────────────────────────────────────────
# Secrets Manager — Para secret rotation
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "secrets_manager_policy" {
  name_prefix = "${var.project_name}-secrets-"
  role        = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "ReadSecretsManager"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.account.account_id}:secret:${var.project_name}/*"
      }
    ]
  })
}

# ──────────────────────────────────────────────────────────────────────────────
# Instance Profile — Conecta role a EC2
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_iam_instance_profile" "ec2_profile" {
  name_prefix = "${var.project_name}-ec2-profile-"
  role        = aws_iam_role.ec2_role.name
}

# ──────────────────────────────────────────────────────────────────────────────
# AWS Account ID (data source)
# ──────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "account" {}
