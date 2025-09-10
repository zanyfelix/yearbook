package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Submit;

@Repository
public interface SubmitRepository extends JpaRepository<Submit, Long> {

	List<Submit> findByUserId(Long userId);

	void deleteByUserId(Long userId);

	List<Submit> findByUserIdAndType(Long userId, String type);

	@Query("SELECT MAX(s.displayOrder) FROM Submit s WHERE s.userId = :userId")
	Integer findMaxDisplayOrderByUserId(@Param("userId") Long userId);

	List<Submit> findByUserIdOrderByDisplayOrder(Long userId);
	
	Optional<Submit> findFirstByTypeAndUserIdIsNull(String type);
	
	List<Submit> findByTypeAndUserIdIsNullOrderByDisplayOrder(String type);

	List<Submit> findByTypeAndUserIdIsNull(String type);

	// 중복 제거 - 하나만 남김
	Optional<Submit> findFirstByType(String type);

	// 추가 필요한 메서드
	List<Submit> findByUserIdIsNull();

	List<Submit> findByUserIdAndTypeNot(Long userId, String type);
}
