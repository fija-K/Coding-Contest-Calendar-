def test_analytics_record_and_get_stats(client):
    # 1. Record visit for a new student
    stu1_id = "test_student_alpha"
    res1 = client.post("/api/v1/analytics/visit", json={"visitor_id": stu1_id})
    assert res1.status_code == 200
    data1 = res1.json()
    assert "total_visits" in data1
    assert data1["total_visits"] >= 1
    assert data1["active_this_month"] >= 1
    assert data1["today_visits"] >= 1
    initial_total = data1["total_visits"]

    # 2. Same student visits again -> total_visits increases by 1
    res2 = client.post("/api/v1/analytics/visit", json={"visitor_id": stu1_id})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_visits"] == initial_total + 1

    # 3. Another student visits -> unique active students count is maintained
    stu2_id = "test_student_beta"
    res3 = client.post("/api/v1/analytics/visit", json={"visitor_id": stu2_id})
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["total_visits"] == initial_total + 2

    # 4. Get stats endpoint returns the same consistent numbers
    stats_res = client.get("/api/v1/analytics/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_visits"] >= initial_total + 2
    assert stats["active_this_month"] >= 2
    assert len(stats["monthly_history"]) >= 1

    # 5. High-water mark synchronization:
    # If client reports observing 500 visits from another container,
    # the serverless container must sync forward and not decrement!
    res_sync = client.post(
        "/api/v1/analytics/visit",
        json={"visitor_id": "test_sync_student", "client_last_visits": 500}
    )
    assert res_sync.status_code == 200
    assert res_sync.json()["total_visits"] == 501
