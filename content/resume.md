---
title: Tom Scanlan — Resume
path: /resume
publishedAt: 2026-06-06T00:00:00.000Z
description: Principal platform engineer with 25+ years building and running production infrastructure.
tags: [resume]
---

# Tom Scanlan

Principal platform engineer · Louisville, KY · Remote · Open to relocation

[tompscanlan@gmail.com](mailto:tompscanlan@gmail.com) · [github.com/tompscanlan](https://github.com/tompscanlan) · [linkedin.com/in/tomscanlan](https://www.linkedin.com/in/tomscanlan) · [openmeet.net](https://openmeet.net)

## Summary

Principal platform engineer with 25+ years building and running production infrastructure, still hands-on every day. I run Kubernetes platforms end to end, from GitOps and monitoring to incident response. At VMware I cleared a year-long blocker that made a product eligible for $100M+ in U.S. federal contracts. Since 2024 I have run all of OpenMeet's production myself, including a move from AWS to DigitalOcean at about half the cost, with a few seconds of disruption at most.

## Experience

### Principal Engineer and Founder, OpenMeet | 2024–Present

An open-source events and groups platform with 2,000+ users and its own AT Protocol server (the network behind Bluesky). I designed it and run all of its production infrastructure.

- Moved all of production (API, Matrix chat, AT Protocol server, PostgreSQL, RabbitMQ, Redis) from AWS EKS to DigitalOcean in July 2026, for about half the hosting cost. Froze writes, restored from cold backups and checked that every count matched before the DNS cutover. Users saw a few seconds of disruption at most.
- Run the platform end to end with GitOps (ArgoCD), Helm, Prometheus, Grafana and OpenTelemetry, upgrades and incident response. Prometheus alerts keep me ahead of trouble. For example, an alert fires when the incoming Bluesky feed goes quiet, which means the ingest pipeline needs a look.
- Traced why most of OpenMeet's accounts were invisible to the Bluesky network to a relay limit of 100 accounts per server, and filed the GitHub issue that got it raised.
- Do most day-to-day engineering with coding agents (Claude Code) under a written process: tracked work, isolated worktrees, an independent review before each merge, and a weekly measure of where time is lost.

### Open Source | 2023–Present

- Built [Snowglobe](https://snowglobe.at), an open-source tool that runs a private copy of the network behind Bluesky in Docker, so apps can test changes before real users meet them. Published on npm, with a hosted public network at [lighthouse.snowglobe.at](https://lighthouse.snowglobe.at).
- 50+ merged pull requests in 2026 to other maintainers' projects, mostly ingest and search infrastructure: a PostgreSQL adapter and end-to-end test suites for [contrail](https://github.com/flo-bit/contrail), an AT Protocol indexer, and search, caching and reliability fixes for the [atmo.rsvp](https://atmo.rsvp) events app.
- 8 merged pull requests to Rust's package manager, cargo (2023), including atomic writes so an interrupted `cargo add` can't leave a half-written manifest.

### Senior Sales Engineering Architect, RackN | 2024

- Shipped Proxmox support in Digital Rebar, a Go bare-metal provisioning platform, and built provisioning automation from hardware bring-up to software configuration.
- Diagnosed customer deployments live (PXE boot, networking) and turned field feedback into platform fixes.

### VMware | 2014–2023 (joined through the MomentumSI acquisition)

**Application Platforms Architect, 2020–2023**

- Cleared a year-long blocker with no clear owner: Azure Government Cloud support for a 60-service Kubernetes application. About 2,000 lines of targeted Java made it eligible for U.S. federal contracts worth $100M+.
- Ran a cross-team process for stuck work: gathered customer pain from sales, matched it to each business unit's most valuable stalled requests, and shepherded 15 of them through to shipping.
- Shipped features into vSphere and vRealize, multimillion-line platforms used by 10,000+ enterprise customers, and mentored engineers across teams.

**Architect, Emerging Technology, 2018–2020**

- Built hands-on Kubernetes, DevOps and edge training for ~3,000 consultants. The DevOps and cloud-native practice was adopted across a $1B professional services organization.

**Senior Consultant, 2014–2018**

- Brought containers, Kubernetes and DevOps practice into VMware's professional services and trained hundreds of consultants. Delivered reliability and automation work at Capital One, Comcast and FedEx.

## Earlier (1997–2014)

Senior Linux systems administrator at The Learning House: led IT for a $15M education platform, scaled storage throughput 10x, and brought in Puppet and Git. Ran RiverSong Farm, a market garden and poultry operation (2008–2012). Embedded Linux at Iptivia, Sereniti and Reefedge: kernel patches, ports, PXE boot. Built and ran infrastructure in three datacenters at Corente and Ecampus.com. Co-founded SquareFish Media, acquired by a regional ISP.

## Skills

- **Use now:** Kubernetes, Helm, ArgoCD, GitHub Actions, Docker, Prometheus, Grafana, OpenTelemetry, PostgreSQL, Redis, RabbitMQ, DigitalOcean, AWS, Cloudflare Workers, AT Protocol, OpenAI and Anthropic APIs
- **Have used:** Terraform, Ansible, Puppet, Azure, GCP, Elasticsearch, Kafka, NATS, Loki, Jaeger, bare-metal provisioning
- **Languages:** TypeScript, Go, Python, Rust, Java, shell

## Education

University of Kentucky, Computer Science coursework
