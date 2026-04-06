output "server_public_ip" {
  description = "IP pública del servidor (Elastic IP)"
  value       = aws_eip.app.public_ip
}

output "server_private_ip" {
  description = "IP privada interna"
  value       = aws_instance.app.private_ip
}

output "instance_id" {
  description = "ID de la instancia EC2"
  value       = aws_instance.app.id
}

output "ssh_command" {
  description = "Comando para conectar vía SSH"
  value       = "ssh -p 2222 -i ~/.ssh/teshlex-aws devsecops@${aws_eip.app.public_ip}"
}

output "security_group_id" {
  description = "ID del Security Group"
  value       = aws_security_group.web.id
}
