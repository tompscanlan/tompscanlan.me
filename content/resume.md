---
title: Tom Scanlan — Resume
path: /resume
publishedAt: 2026-06-06T00:00:00.000Z
description: Principal engineer with 25+ years building production software. Founder of OpenMeet.
tags: [resume]
---

# Tom Scanlan

tompscanlan@gmail.com | Louisville, KY | Remote OK | Open to Relocation

[github.com/tompscanlan](https://github.com/tompscanlan) | [linkedin.com/in/tomscanlan](https://www.linkedin.com/in/tomscanlan) | [openmeet.net](https://openmeet.net)

---

## Summary

Hands-on principal engineer with 25+ years building and shipping production software, still writing code every day. Deep across the stack: TypeScript/NestJS services, Kubernetes platform engineering, observability, and production LLM integration with bounded cost and latency. Past work: shipped into multimillion-line enterprise platforms, unlocked $100M+ in U.S. federal contract eligibility with ~2,000 lines of targeted Java, and mentored engineers through the cross-team problems that stall organizations.

---

## Core Skills

**Languages:** TypeScript, Go, Rust, Python, Java, shell
**Platform:** Kubernetes, Docker, Helm, Terraform, Ansible, AWS, Azure, GCP, bare-metal automation
**Delivery & Observability:** GitHub Actions, ArgoCD, Prometheus, Grafana, OpenTelemetry, Jaeger, Loki
**Data & Messaging:** PostgreSQL, Redis, Elasticsearch, RabbitMQ, Kafka, NATS, MQTT
**Security:** TLS/PKI (cert-manager), Sealed Secrets, Kubernetes RBAC
**AI/LLM:** OpenAI & Anthropic APIs, cost-bounded routing, async generation, prompt iteration, Claude Code

---

## Experience

### Founder & Principal Engineer, OpenMeet LLC | 2024–Present

Open-source, federated alternative to Meetup, removing the pricing barrier that excludes grassroots community organizers. Sole architect and operator of a production system, end to end.

- Architected and built a six-service TypeScript/NestJS backend with a Quasar/Vue frontend; stateful workloads (PostgreSQL, Redis, RabbitMQ, Elasticsearch) on self-hosted Kubernetes
- Implemented AT Protocol federation for decentralized identity and data portability; integrated Matrix for real-time community chat
- Run the full delivery loop solo: GitHub Actions and ArgoCD CI/CD, infrastructure-as-code (Terraform, Helm), and an observability stack (Prometheus, Grafana, OpenTelemetry/Jaeger) that supports same-day diagnosis of production incidents
- Designed and shipped LLM-powered features: a survey builder that turns a research question into a structured survey, and an event-ingestion pipeline normalizing unstructured data (scraped pages, forwarded emails) via cheap-model-first, escalate-on-low-confidence routing that bounds per-request cost
- Production LLM patterns: async generation off the request path via RabbitMQ workers, response caching, graceful UI degradation when models are slow or unavailable
- Operate production infrastructure end to end: deployments, upgrades, capacity, incident response, and TLS/PKI plus Sealed Secrets-based secrets management

### Senior Sales Engineering Architect, RackN | 2024

Pre-sales role weighted ~75% toward engineering spikes that shipped as product features in Digital Rebar, a Go-based bare-metal provisioning platform.

- Developed and shipped Proxmox hypervisor support, extending out-of-the-box automation to a new class of infrastructure
- Built deployment images and authored provisioning automations (shell, templated workflows) spanning hardware bring-up through software configuration
- Diagnosed customer deployment issues live on support calls (PXE boot, networking, bare-metal lifecycle) and turned field feedback into platform fixes

### Application Platforms Architect, VMware Inc. | 2020–2023

- Identified and resolved year-long Azure Government Cloud blockers across a 60-service Kubernetes application, unlocking $100M+ in U.S. federal contract eligibility with ~2,000 lines of targeted Java
- Shipped features into a multimillion-line enterprise platform serving 10,000+ global customers
- Built a repeatable cross-functional process to identify and close 15 high-value product gaps ($5M+ each), converting ambiguous customer signals into shipped roadmap items
- Mentored engineers across teams on system design, technical growth, and career development

### Architect, Emerging Technology, VMware Inc. | 2018–2020

- Built curriculum and hands-on training for ~3,000 consultants covering DevOps, Kubernetes, IoT, edge computing, and multi-cloud architectures
- Built a working IoT ML pipeline (sensor data to trained classifiers to recommendations) as a teaching instrument demonstrating end-to-end ML integration and safe data-movement patterns
- Developed DevOps and cloud-native practice capabilities adopted across a $1B professional services organization; published a weekly internal technical blog

### Senior Consultant, VMware Inc. (via MomentumSI acquisition) | 2014–2018

- Introduced containers, Kubernetes, and modern DevOps practices to VMware PSO; trained hundreds of consultants
- Delivered infrastructure reliability and automation engagements (configuration management, CI/CD, cloud migration) at Capital One, Comcast, FedEx, and similar large enterprises

---

## Early Career (1997–2014)

**Senior Linux Systems Administrator, The Learning House (2013–2014).** Led IT for a $15M education platform; scaled storage throughput 10x, introduced Puppet/Git configuration management, automated cloud deploy/destroy cycles to cut hosting costs.

**Founder & Operator, RiverSong Farm (2008–2012).** Restored a fallow farm into a working market-garden and poultry operation; four years building something physical, end to end.

**Embedded networking & systems software (2003–2007).** Senior Software Engineer at Iptivia, Sereniti, and Reefedge: Linux kernel patches, cross-platform ports, PXE boot systems.

**Linux & network engineering (1999–2003).** Built and operated infrastructure across three datacenters at Corente and Ecampus.com. **Founder, SquareFish Media (1998–2000).** Co-founded a web/media startup; acquired by a regional ISP.

---

**Education:** Computer Science, University of Kentucky (three years completed)
