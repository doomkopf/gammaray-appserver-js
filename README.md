# Gammaray application server engine

A scalable application server engine.

## Motivation

Throughout my history of working on 3D games and later MMO games as a backend developer, I realized that for client
development there is a lot of engines out there that basically solve all the common problems for you:

- The whole rendering pipeline with all VSD/HSR techniques
- Different implementations for the rendering API (OpenGL, WebGL, Direct3D, Metal, ...)
- Collision detection/response with physics
- Animations + state machine

and so on. All you have to do is basically just feeding the engine with textures, 3D models and game logic/scripts.

On the backend side however you have to deal with completely different problems:

- Building the API or protocol
- State handling
- Caching
- Scalability
- Transaction handling which is highly depending on the specific DBMS
- Which DBMS to use? Multiple ones?
- How to address/query for an entity/state? Is a SQL query enough? Do we need an extra search index?
- Microservices?
- Which architecture? Domain-Driven-Design?

and so on. You'll come up with very different solutions depending on the specific performance needs. For non-frequent
access the solution is stateless where state is always read from the database and uses a SQL database with transactions.
For high frequent access (e.g. real time movements of entities in games) you store in memory (stateful) and store it
back to a document based DBMS on a lower frequency. Then the requirements change and the SQL solution needs to be high
performance as well, and you start asking yourself why you didn't handle all business entities with one generic solution
in the first place. Scaling up the SQL database will increase the cost drastically.
And when you start dealing with in memory state handling, it opens up a whole new bag of problems:

- Which concurrency model should be used?
- Classical lock based which will end up in deadlocks as soon as complexity increases
- STM which only makes sense when you don't expect too many transactional collisions
- Isolated mutable state, which requires rewriting the whole existing code since state is accessed in a very different
  way
- Nowadays, your backend isn't just one physical machine: On which node is the desired state located at? On the one the
  client is connected to? But what if it is shared state?

So what we need is something similar to the idea of a Game/3D-Engine - but that solves most of the backend problems
instead.

## Features

- Automatic horizontal scaling by just spawning more servers
- Apps are deployed to the appserver at runtime keeping client sessions open - zero downtime (like in the original idea
  of Java-EE application servers)
- Isolated mutable state by design / in-memory state handling (sometimes called actor model)
- You're just writing functions with business logic - no infrastructure or technology decisions
- Automatic persistence of entities cyclically in the background
- Automatic indexing of entity attributes to make them queryable (maybe it is a bit megalomaniac, but: No search index
  necessary like elasticsearch or others)
- Custom/internal protocol or REST with automatically generated OpenAPI
- Independence of DBMS: You can use any DBMS by just implementing the ``Database`` interface

## Planned features

- Transactions between multiple business entities
