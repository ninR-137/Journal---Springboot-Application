package com.dioneo.journal.repositories;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

import com.dioneo.journal.entities.Role;

public interface RoleRepository extends JpaRepository<Role, Long>{
    Optional<Role> findByName(String name);
}