---
title: Tom Scanlan — Resume
path: /resume
publishedAt: 2026-06-06T00:00:00.000Z
description: Principal engineer with 25+ years building production software. Founder of OpenMeet.
tags: [resume]
---

# Tom Scanlan

Principal engineer · Louisville, KY · Remote

[tompscanlan@gmail.com](mailto:tompscanlan@gmail.com) · [github.com/tompscanlan](https://github.com/tompscanlan) · [linkedin.com/in/tomscanlan](https://www.linkedin.com/in/tomscanlan) · [openmeet.net](https://openmeet.net)

## Summary

Hands-on principal engineer with 25+ years building and running production software, still writing code every day. My current work is on AT Protocol, the open network behind Bluesky. I run OpenMeet's production platform alone, maintain Snowglobe, an open-source test network for atproto apps, and merged 50+ pull requests into other maintainers' atproto projects in 2026. Before that, at VMware, I unlocked $100M+ in U.S. federal contract eligibility with ~2,000 lines of targeted Java, shipped into multimillion-line enterprise platforms, and mentored engineers through the cross-team problems that stall organizations.

## Core Skills

- **Languages** &nbsp;TypeScript, Go, Rust, Python, Java, shell
- **AT Protocol** &nbsp;PDS hosting and operation, OAuth, lexicons, relays, Jetstream, PLC, permissioned spaces (alpha)
- **Platform** &nbsp;Kubernetes, Docker, Helm, Terraform, Ansible, AWS, Azure, GCP, DigitalOcean, Cloudflare Workers and D1, bare-metal automation
- **Delivery & Observability** &nbsp;GitHub Actions, ArgoCD, Prometheus, Grafana, OpenTelemetry, Jaeger, Loki
- **Data & Messaging** &nbsp;PostgreSQL, Redis, Elasticsearch, RabbitMQ, Kafka, NATS, MQTT
- **Security** &nbsp;TLS/PKI (cert-manager), Sealed Secrets, Kubernetes RBAC
- **AI/LLM** &nbsp;OpenAI & Anthropic APIs, cost-bounded routing, async generation, prompt iteration, Claude Code

## Experience

### Founder & Principal Engineer, OpenMeet LLC | 2024–Present

Open-source, federated alternative to Meetup, removing the pricing barrier that excludes grassroots community organizers. Sole architect and operator of a production system with 500+ accounts on its own AT Protocol PDS.

- Architected and built a six-service TypeScript/NestJS backend with a Quasar/Vue frontend; stateful workloads (PostgreSQL, Redis, RabbitMQ, Elasticsearch) on Kubernetes
- Implemented AT Protocol federation, so every user has a real PDS account they can take with them; integrated Matrix for real-time community chat
- Moved all of production (API, Matrix, PDS, PostgreSQL, RabbitMQ, Redis) from AWS EKS to DigitalOcean alone in July 2026, with a gated DNS cutover and the AWS stack torn down eight days later
- Found why 437 of 537 OpenMeet accounts were invisible to the Bluesky network (a relay limit of 100 accounts per PDS) and made the case upstream; the limit was raised to 1,000 the same day and every account became visible
- Run the full delivery loop solo: GitHub Actions and ArgoCD, Terraform and Helm, Prometheus, Grafana and OpenTelemetry/Jaeger, TLS/PKI and Sealed Secrets, upgrades and incident response
- Designed and shipped LLM features: a survey builder that turns a research question into a structured survey, and an event-ingestion pipeline that normalizes scraped pages and forwarded emails with cheap-model-first routing to bound per-request cost. Generation runs off the request path on RabbitMQ workers, with caching and graceful degradation when models are slow

### Open-Source Work | 2023–Present

- Created and maintain [Snowglobe](https://snowglobe.at), a private atproto network in Docker (PDS, PLC directory, relay, Jetstream, real TLS names) so apps can test OAuth, draft lexicons and new PDS builds before real users meet them. Published on npm, with a hosted public network at [lighthouse.snowglobe.at](https://lighthouse.snowglobe.at)
- Merged 50+ pull requests in 2026 into other maintainers' atproto projects: [contrail](https://github.com/flo-bit/contrail), an atproto indexing library (PostgreSQL adapter, an end-to-end suite against a local atproto stack, ingest reliability fixes); [atmo.rsvp](https://atmo.rsvp), an events app (search, near-me geocoding, pagination, running on other atproto networks); atmo-kit; and Roomy (calendar integration)
- Prototyping groups on AT Protocol against the draft community standard and Bluesky's permissioned-spaces alpha: a [group host](https://github.com/tompscanlan/atproto-group-host) and private events for atmo.rsvp
- Earlier: 8 merged pull requests to Rust's package manager, cargo (2023), including a fix for index corruption when cargo is killed mid-write

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

## Early Career (1997–2014)

**Senior Linux Systems Administrator, The Learning House (2013–2014).** Led IT for a $15M education platform; scaled storage throughput 10x, introduced Puppet/Git configuration management, automated cloud deploy/destroy cycles to cut hosting costs.

**Founder & Operator, RiverSong Farm (2008–2012).** Restored a fallow farm into a working market-garden and poultry operation; four years building something physical, end to end.

**Embedded networking & systems software (2003–2007).** Senior Software Engineer at Iptivia, Sereniti, and Reefedge: Linux kernel patches, cross-platform ports, PXE boot systems.

**Linux & network engineering (1999–2003).** Built and operated infrastructure across three datacenters at Corente and Ecampus.com. **Founder, SquareFish Media (1998–2000).** Co-founded a web/media startup; acquired by a regional ISP.

## Education

Computer Science, University of Kentucky (three years completed)
